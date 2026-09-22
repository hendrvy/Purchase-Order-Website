package api

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// UploadFileAttachment - Upload file attachment and return attachment ID
func UploadFileAttachment(c *gin.Context) (uint, error) {
	file, err := c.FormFile("file")

	if err != nil {
		return 0, err
	}

	// Validate file BEFORE saving to disk
	if err := ValidateFile(file); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid File type",
		})
		return 0, err
	}

	var attachment Attachment = Attachment{
		FileName: file.Filename,
		FilePath: GenerateUniqueFilename(file.Filename),
		MimeType: GetMimeType(file.Filename),
	}

	dst := filepath.Join(folderPath, attachment.FilePath)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed while saving file to backend",
		})
		return 0, err
	}

	fmt.Println(GenerateUniqueFilename(file.Filename))

	if err := CreateAttachmentDB(&attachment); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to create attachment record",
		})
		return 0, err
	}

	return attachment.ID, nil
}

// UploadFileAttachmentWithPath - Upload file and return attachment ID with file path
func UploadFileAttachmentWithPath(c *gin.Context) (uint, string, error) {
	file, err := c.FormFile("file")

	if err != nil {
		return 0, "", err
	}

	if err := ValidateFile(file); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid File type",
		})
		return 0, "", err
	}

	var attachment Attachment = Attachment{
		FileName: file.Filename,
		FilePath: GenerateUniqueFilename(file.Filename),
		MimeType: GetMimeType(file.Filename),
	}

	dst := filepath.Join(folderPath, attachment.FilePath)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed while saving file to backend",
		})
		return 0, "", err
	}

	if err := CreateAttachmentDB(&attachment); err != nil {
		os.Remove(dst)
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to create attachment record",
		})
		return 0, "", err
	}

	return attachment.ID, dst, nil
}

// UploadMultipleAttachmentsForPO - Upload multiple files and return created Attachment records
// plus the disk paths written, so callers can roll back (delete files) if a
// later step (e.g. DB insert of the purchase order) fails.
func UploadMultipleAttachmentsForPO(c *gin.Context, files []*multipart.FileHeader) ([]Attachment, []string, error) {
	var attachments []Attachment
	var filePaths []string

	for _, file := range files {
		if err := ValidateFile(file); err != nil {
			return attachments, filePaths, err
		}

		attachment := Attachment{
			FileName: file.Filename,
			FilePath: GenerateUniqueFilename(file.Filename),
			MimeType: GetMimeType(file.Filename),
		}

		dst := filepath.Join(folderPath, attachment.FilePath)
		if err := c.SaveUploadedFile(file, dst); err != nil {
			return attachments, filePaths, fmt.Errorf("failed to save file %s: %w", file.Filename, err)
		}
		filePaths = append(filePaths, dst)

		if err := CreateAttachmentDB(&attachment); err != nil {
			return attachments, filePaths, fmt.Errorf("failed to create attachment record for %s: %w", file.Filename, err)
		}

		attachments = append(attachments, attachment)
	}

	return attachments, filePaths, nil
}

// UploadFile - Wrapper for uploading single file
func UploadFile(c *gin.Context) {
	attachmentID, err := UploadFileAttachment(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to upload file",
		})
		return
	}
	c.JSON(http.StatusCreated, JsonResponse{
		Status:  http.StatusCreated,
		Message: "File uploaded successfully",
		Data:    map[string]uint{"attachment_id": attachmentID},
	})
}

// UploadMultipleAttachments - Upload multiple file attachments (max 10 files, 5MB each)
func UploadMultipleAttachments(c *gin.Context) {
	const MaxFiles = 10
	const MaxFileSize = 5 * 1024 * 1024 // 5MB in bytes

	// Parse multipart form with size limit
	err := c.Request.ParseMultipartForm(MaxFileSize * MaxFiles)
	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Failed to parse multipart form",
			Message: "Form size exceeds maximum limit",
		})
		return
	}

	form := c.Request.MultipartForm
	if form == nil || form.File == nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "No files uploaded",
			Message: "At least one file is required",
		})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "No files found with key 'files'",
			Message: "File field is required",
		})
		return
	}

	// Validate number of files
	if len(files) > MaxFiles {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   fmt.Sprintf("Too many files. Maximum %d files allowed", MaxFiles),
			Message: "File limit exceeded",
		})
		return
	}

	// Process each file
	var uploadedAttachments []map[string]interface{}
	var uploadedFilePaths []string
	var failedFiles []map[string]string

	for idx, file := range files {
		// Validate file size
		if file.Size > MaxFileSize {
			failedFiles = append(failedFiles, map[string]string{
				"filename": file.Filename,
				"error":    fmt.Sprintf("File size exceeds 5MB limit (%.2f MB)", float64(file.Size)/(1024*1024)),
			})
			continue
		}

		// Validate file type
		if err := ValidateFile(file); err != nil {
			failedFiles = append(failedFiles, map[string]string{
				"filename": file.Filename,
				"error":    err.Error(),
			})
			continue
		}

		// Create attachment record
		attachment := Attachment{
			FileName: file.Filename,
			FilePath: GenerateUniqueFilename(file.Filename),
			MimeType: GetMimeType(file.Filename),
		}

		// Save file to storage
		dst := filepath.Join(folderPath, attachment.FilePath)
		if err := c.SaveUploadedFile(file, dst); err != nil {
			failedFiles = append(failedFiles, map[string]string{
				"filename": file.Filename,
				"error":    "Failed to save file to storage",
			})
			continue
		}

		// Create attachment record in database
		if err := CreateAttachmentDB(&attachment); err != nil {
			// Cleanup file if database operation fails
			os.Remove(dst)
			failedFiles = append(failedFiles, map[string]string{
				"filename": file.Filename,
				"error":    "Failed to create attachment record",
			})
			continue
		}

		// Track successful upload
		uploadedFilePaths = append(uploadedFilePaths, dst)
		uploadedAttachments = append(uploadedAttachments, map[string]interface{}{
			"index":          idx,
			"attachment_id":  attachment.ID,
			"filename":       attachment.FileName,
			"original_name":  file.Filename,
			"file_path":      attachment.FilePath,
			"mime_type":      attachment.MimeType,
			"size_bytes":     file.Size,
			"size_mb":        fmt.Sprintf("%.2f", float64(file.Size)/(1024*1024)),
		})
	}

	// Determine response status
	responseStatus := http.StatusCreated
	var message string

	if len(uploadedAttachments) == 0 {
		responseStatus = http.StatusBadRequest
		message = "No files were uploaded successfully"
	} else if len(failedFiles) > 0 {
		responseStatus = http.StatusMultiStatus
		message = fmt.Sprintf("Partially uploaded: %d/%d files uploaded successfully", len(uploadedAttachments), len(files))
	} else {
		message = fmt.Sprintf("Successfully uploaded %d file(s)", len(uploadedAttachments))
	}

	responseData := map[string]interface{}{
		"total_files":          len(files),
		"successful":           len(uploadedAttachments),
		"failed":               len(failedFiles),
		"uploaded_attachments": uploadedAttachments,
	}

	if len(failedFiles) > 0 {
		responseData["failed_files"] = failedFiles
	}

	c.JSON(responseStatus, JsonResponse{
		Status:  responseStatus,
		Message: message,
		Data:    responseData,
	})
}

// DownloadFile - Download file attachment with access control and logging
func DownloadFile(c *gin.Context) {
	attachmentIDstr := c.Param("id")
	var attachmentID uint
	_, err := fmt.Sscanf(attachmentIDstr, "%d", &attachmentID)

	if err != nil || attachmentID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid attachment ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	attachment, err := GetAttachmentByID(attachmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "File not found",
			Message: "Attachment does not exist",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	// Get the purchase order ID associated with this attachment
	poID, err := GetPOIDFromAttachment(attachmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Purchase order not found",
			Message: "This file is not associated with any purchase order",
		})
		return
	}

	// Get the owner (company) of the file
	ownerID, err := GetFileOwner(attachmentID)
	if err != nil {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You do not have permission to download this file",
		})
		return
	}

	if userRole == "user" && ownerID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You can only download your own company's files",
		})
		return
	}

	ipAddress := c.ClientIP()

	filePath := filepath.Join(folderPath, attachment.FilePath)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "File not found on disk",
			Message: "The file has been deleted",
		})
		return
	}

	downloadLog := DownloadLog{
		UserID:       userID,
		AttachmentID: attachmentID,
		POID:         poID,
		IPAddress:    ipAddress,
	}
	CreateDownloadLog(&downloadLog)

	disposition := "attachment"
	if strings.Contains(attachment.MimeType, "image") || strings.Contains(attachment.MimeType, "text") {
		disposition = "inline"
	}

	c.Header("Content-Disposition", fmt.Sprintf("%s; filename=\"%s\"", disposition, attachment.FileName))
	c.Header("Content-Type", attachment.MimeType)
	c.File(filePath)
}
