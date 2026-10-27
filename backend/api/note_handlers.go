package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

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

	// Opening the thread marks everything in it as read for this user.
	if len(notes) > 0 {
		markNotesRead(c.GetUint("user_id"), poID, notes[len(notes)-1].ID)
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Success retrieving data",
		Data:    notes,
	})
}

// markNotesRead - Move the user's read marker for a PO forward to lastNoteID
// (never backwards). Best effort: a failure only leaves the badge visible.
func markNotesRead(userID, poID, lastNoteID uint) {
	DB.Exec(`INSERT INTO po_note_reads (user_id, purchase_order_id, last_read_note_id, updated_at)
		VALUES (?, ?, ?, NOW())
		ON CONFLICT (user_id, purchase_order_id) DO UPDATE
		SET last_read_note_id = GREATEST(po_note_reads.last_read_note_id, EXCLUDED.last_read_note_id),
			updated_at = NOW()`, userID, poID, lastNoteID)
}

// UnreadNoteItem - One purchase order with unread messages in its thread.
type UnreadNoteItem struct {
	PurchaseOrderID uint      `json:"purchase_order_id"`
	PONumber        string    `json:"po_number"`
	CompanyName     string    `json:"company_name"`
	UnreadCount     int       `json:"unread_count"`
	LastMessage     string    `json:"last_message"`
	LastStatusTo    string    `json:"last_status_to,omitempty"`
	LastAuthor      string    `json:"last_author"`
	LastAuthorRole  string    `json:"last_author_role"`
	LastAt          time.Time `json:"last_at"`
}

// MaxUnreadNoteItems - Rows returned by GetUnreadNotes (the total counts all).
const MaxUnreadNoteItems = 10

// GetUnreadNotes - GET /notifications/notes
// Unread = notes from the other side of the conversation newer than the
// user's read marker on that PO: a buyer (`user`) sees staff notes on their
// own POs, staff see buyer replies on any PO.
func GetUnreadNotes(c *gin.Context) {
	userID := c.GetUint("user_id")
	isBuyer := c.GetString("role") == "user"

	query := DB.Table("po_notes n").
		Select(`n.purchase_order_id AS purchase_order_id, po.po_number AS po_number,
			co.company_name AS company_name, COUNT(*) AS unread_count, MAX(n.id) AS last_note_id`).
		Joins("JOIN purchase_orders po ON po.id = n.purchase_order_id AND po.deleted_at IS NULL").
		Joins("JOIN companies co ON co.id = po.company_id").
		Joins("LEFT JOIN po_note_reads r ON r.purchase_order_id = n.purchase_order_id AND r.user_id = ?", userID).
		Where("n.id > COALESCE(r.last_read_note_id, 0)")
	if isBuyer {
		query = query.Where("po.company_id = ? AND n.author_role <> 'user'", userID)
	} else {
		query = query.Where("n.author_role = 'user'")
	}

	var rows []struct {
		PurchaseOrderID uint
		PONumber        string
		CompanyName     string
		UnreadCount     int
		LastNoteID      uint
	}
	if err := query.
		Group("n.purchase_order_id, po.po_number, co.company_name").
		Order("MAX(n.id) DESC").
		Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to load unread notes",
		})
		return
	}

	total := 0
	for _, r := range rows {
		total += r.UnreadCount
	}
	if len(rows) > MaxUnreadNoteItems {
		rows = rows[:MaxUnreadNoteItems]
	}

	lastIDs := make([]uint, 0, len(rows))
	for _, r := range rows {
		lastIDs = append(lastIDs, r.LastNoteID)
	}
	lastNotes := map[uint]PONote{}
	if len(lastIDs) > 0 {
		var notes []PONote
		if err := DB.Preload("Author").Where("id IN ?", lastIDs).Find(&notes).Error; err != nil {
			c.JSON(http.StatusInternalServerError, JsonResponse{
				Status:  http.StatusInternalServerError,
				Error:   err.Error(),
				Message: "Failed to load unread notes",
			})
			return
		}
		for _, n := range notes {
			lastNotes[n.ID] = n
		}
	}

	items := make([]UnreadNoteItem, 0, len(rows))
	for _, r := range rows {
		n := lastNotes[r.LastNoteID]
		author := ""
		if n.Author != nil {
			author = n.Author.CompanyName
			if author == "" {
				author = n.Author.Username
			}
		}
		items = append(items, UnreadNoteItem{
			PurchaseOrderID: r.PurchaseOrderID,
			PONumber:        r.PONumber,
			CompanyName:     r.CompanyName,
			UnreadCount:     r.UnreadCount,
			LastMessage:     n.Message,
			LastStatusTo:    n.StatusTo,
			LastAuthor:      author,
			LastAuthorRole:  n.AuthorRole,
			LastAt:          n.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Success retrieving data",
		Data: gin.H{
			"total": total,
			"items": items,
		},
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
