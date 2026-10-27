package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const MaxNoteLength = 1000

// ProofTypes accepted when moving a PO from shipping to complete.
const (
	ProofTypeResi   = "resi"
	ProofTypePickup = "pickup"
)

// ProofSubfolder - proof files (resi / pickup) live in their own folder under
// the upload dir, separate from the files the buyer attaches to the PO.
const ProofSubfolder = "proofs"

func isValidProofType(t string) bool {
	return t == ProofTypeResi || t == ProofTypePickup
}

// GetPONotesDB - All notes of a purchase order, oldest first, with the
// author (password stripped) and proof attachment preloaded.
func GetPONotesDB(poID uint) ([]PONote, error) {
	var notes []PONote
	err := DB.Preload("Author").Preload("Attachment").
		Where("purchase_order_id = ?", poID).
		Order("created_at ASC, id ASC").
		Find(&notes).Error
	if err != nil {
		return nil, err
	}
	for i := range notes {
		if notes[i].Author != nil {
			notes[i].Author = &Company{
				ID:          notes[i].Author.ID,
				Role:        notes[i].Author.Role,
				Username:    notes[i].Author.Username,
				CompanyName: notes[i].Author.CompanyName,
			}
		}
	}
	return notes, nil
}

// changeStatusWithNote - Update the PO status, store the optional proof
// attachment (linked to the PO so it can be downloaded with the usual
// owner checks) and append a status-change entry to the note thread, all
// in one transaction.
func changeStatusWithNote(po *PurchaseOrder, newStatus, message, proofType string, attachment *Attachment, authorID uint, authorRole string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if attachment != nil {
			if err := tx.Create(attachment).Error; err != nil {
				return err
			}
			link := PurchaseOrderAttachment{PurchaseOrderID: po.ID, AttachmentID: attachment.ID}
			if err := tx.Create(&link).Error; err != nil {
				return err
			}
		}

		if err := tx.Model(&PurchaseOrder{}).Where("id = ?", po.ID).Update("status", newStatus).Error; err != nil {
			return err
		}

		note := PONote{
			PurchaseOrderID: po.ID,
			CompanyID:       authorID,
			AuthorRole:      authorRole,
			Message:         message,
			StatusFrom:      po.Status,
			StatusTo:        newStatus,
			ProofType:       proofType,
		}
		if attachment != nil {
			note.AttachmentID = &attachment.ID
		}
		return tx.Create(&note).Error
	})
}

// saveProofFile - Validate and write the proof file to disk (the DB record
// is created later inside the status transaction). Returns the attachment
// and the written path so the caller can roll back.
func saveProofFile(c *gin.Context) (*Attachment, string, error) {
	file, err := c.FormFile("proof")
	if err != nil {
		return nil, "", fmt.Errorf("proof file is required when moving to 'complete'")
	}
	if err := ValidateProofFile(file); err != nil {
		return nil, "", err
	}

	attachment := &Attachment{
		FileName: file.Filename,
		FilePath: ProofSubfolder + "/" + GenerateUniqueFilename(file.Filename),
		MimeType: GetMimeType(file.Filename),
	}
	dst := filepath.Join(folderPath, attachment.FilePath)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		return nil, "", fmt.Errorf("failed to save proof file: %w", err)
	}
	return attachment, dst, nil
}

// canAccessPO - A `user` may only touch their own purchase orders.
func canAccessPO(c *gin.Context, ownerID uint) bool {
	return c.GetString("role") != "user" || ownerID == c.GetUint("user_id")
}

// GetPurchaseOrderNotes - GET /purchase-orders/:id/notes
func GetPurchaseOrderNotes(c *gin.Context) {
	var poID uint
	if _, err := fmt.Sscanf(c.Param("id"), "%d", &poID); err != nil || poID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid purchase order ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	ownerID, err := GetPurchaseOrderOwner(poID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Purchase order not found",
			Message: "No purchase order with that ID",
		})
		return
	}
	if !canAccessPO(c, ownerID) {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You can only view notes of your own purchase orders",
		})
		return
	}

	notes, err := GetPONotesDB(poID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   "Database Failed to return data",
			Message: "Failed",
		})
		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Success retrieving data",
		Data:    notes,
	})
}

type createNoteRequest struct {
	Message  string `json:"message"`
	ParentID *uint  `json:"parent_id"`
}

// CreatePurchaseOrderNote - POST /purchase-orders/:id/notes
// Adds a reply to the thread. The buyer (`user`) can only reply to an
// existing note on their own PO; staff may reply or start a new note.
func CreatePurchaseOrderNote(c *gin.Context) {
	var poID uint
	if _, err := fmt.Sscanf(c.Param("id"), "%d", &poID); err != nil || poID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid purchase order ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	ownerID, err := GetPurchaseOrderOwner(poID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Purchase order not found",
			Message: "No purchase order with that ID",
		})
		return
	}
	if !canAccessPO(c, ownerID) {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You can only add notes to your own purchase orders",
		})
		return
	}

	var req createNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	message := strings.TrimSpace(req.Message)
	if message == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   "message is required",
		})
		return
	}
	if len([]rune(message)) > MaxNoteLength {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   fmt.Sprintf("message must be at most %d characters", MaxNoteLength),
		})
		return
	}

	userRole := c.GetString("role")
	if userRole == "user" && req.ParentID == nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   "parent_id is required: buyers can only reply to an existing note",
		})
		return
	}

	var parentID *uint
	if req.ParentID != nil {
		var parent PONote
		if err := DB.Where("id = ? AND purchase_order_id = ?", *req.ParentID, poID).First(&parent).Error; err != nil {
			c.JSON(http.StatusNotFound, JsonResponse{
				Status:  http.StatusNotFound,
				Error:   "Parent note not found",
				Message: "The note being replied to does not exist on this purchase order",
			})
			return
		}
		// Keep the thread one level deep: replying to a reply attaches to
		// the same root note.
		root := parent.ID
		if parent.ParentID != nil {
			root = *parent.ParentID
		}
		parentID = &root
	}

	note := PONote{
		PurchaseOrderID: poID,
		ParentID:        parentID,
		CompanyID:       c.GetUint("user_id"),
		AuthorRole:      userRole,
		Message:         message,
	}
	if err := DB.Create(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to create note",
		})
		return
	}

	// Touch the PO so it surfaces at the top of the default
	// updated_at-sorted lists for the other party.
	DB.Model(&PurchaseOrder{}).Where("id = ?", poID).Update("updated_at", gorm.Expr("NOW()"))

	c.JSON(http.StatusCreated, JsonResponse{
		Status:  http.StatusCreated,
		Message: "Note added successfully",
		Data:    note,
	})
}

func removeFiles(paths ...string) {
	for _, p := range paths {
		if p != "" {
			os.Remove(p)
		}
	}
}
