package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// GetPurchaseOrders - Get all purchase orders (with role-based filtering)
func GetPurchaseOrders(c *gin.Context) {
	userRole := c.GetString("role")

	if userRole == "user" {
		GetPurchaseOrdersByCompany(c)
		return
	}

	page := queryInt(c, "page", 1)
	limit := queryInt(c, "limit", 10)

	purchaseOrders, err := GetAllPurchaseOrdersDB(page, limit)

	if err != nil {
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Message: "Failed to retrieve purchase orders",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Retrieved purchase orders",
		Data:    purchaseOrders,
	})
}

// GetPurchaseOrderByID - Get purchase order by ID
func GetPurchaseOrderByID(c *gin.Context) {
	poIDstr := c.Param("id")
	var poID uint
	_, err := fmt.Sscanf(poIDstr, "%d", &poID)

	if err != nil || poID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid purchase order ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	purchaseOrder, err := GetPurchaseOrderByIDDB(uint(poID))

	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Message: "Purchase order not found",
			Error:   err.Error(),
		})
		return
	}

	if userRole == "user" && purchaseOrder.CompanyID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Message: "Access denied",
			Error:   "You do not have permission to access this purchase order",
		})
		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Purchase order retrieved successfully",
		Data:    purchaseOrder,
	})
}

// CreatePurchaseOrder - Create new purchase order with one or more file attachments
func CreatePurchaseOrder(c *gin.Context) {
	// Extract payload from multipart form
	payloadStr := c.PostForm("payload")
	if payloadStr == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Missing payload field",
			Message: "Failed to parse purchase order data",
		})
		return
	}

	// Unmarshal JSON payload into PurchaseOrder struct
	var reqpo PurchaseOrder
	err := json.Unmarshal([]byte(payloadStr), &reqpo)
	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid JSON in payload: " + err.Error(),
			Message: "Failed to parse purchase order data",
		})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Failed to parse multipart form",
		})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Bad Request, No File upload",
			Message: "At least one file is required",
		})
		return
	}

	if len(files) > MaxAttachmentsPerPO {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   fmt.Sprintf("Too many files. Maximum %d files allowed", MaxAttachmentsPerPO),
			Message: "File limit exceeded",
		})
		return
	}

	// Validate required fields
	if err := ValidatePOCreateFields(reqpo.PONumber, reqpo.Title, reqpo.TotalAmount, reqpo.Status); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid po fields",
		})
		return
	}

	if reqpo.CompanyID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "company_id is required and must be greater than 0",
			Message: "Invalid po fields",
		})
		return
	}

	if !ValidateCompanyExists(reqpo.CompanyID) {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Company not found",
			Message: "Invalid company_id",
		})
		return
	}

	attachments, filePaths, err := UploadMultipleAttachmentsForPO(c, files)
	if err != nil {
		for _, path := range filePaths {
			os.Remove(path)
		}
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   err.Error(),
			Message: "Failed to upload attachments",
		})
		return
	}

	reqpo.Attachments = attachments
	errs := CreatePurchaseOrderDB(&reqpo)

	if errs != nil {
		for _, path := range filePaths {
			os.Remove(path)
		}
		c.JSON(http.StatusInternalServerError, JsonResponse{
			Status:  http.StatusInternalServerError,
			Error:   errs.Error(),
			Message: "Failed inserting new record on purchaseorder table",
		})
		return
	}

	c.JSON(http.StatusCreated, JsonResponse{
		Status:  http.StatusCreated,
		Message: "Created Purchase order Successfully",
		Data:    reqpo,
	})
}

// UpdatePurchaseOrder - Update existing purchase order
func UpdatePurchaseOrder(c *gin.Context) {
	poIDstr := c.Param("id")
	var poID uint
	var poReq PurchaseOrder
	_, err := fmt.Sscanf(poIDstr, "%d", &poID)

	if err != nil || poID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid purchase order ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	ownerID, err := GetPurchaseOrderOwner(poID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Purchase order not found",
			Message: "No purchase order with that ID",
		})
		return
	}

	if userRole == "user" && ownerID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You do not have permission to update this purchase order",
		})
		return
	}

	err = c.BindJSON(&poReq)

	if err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid request format",
		})
		return
	}

	if err := ValidatePOFields(poReq.PONumber, poReq.Status); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   err.Error(),
			Message: "Invalid po fields",
		})
		return
	}

	errs := UpdatePurchaseOrderDB(poID, &poReq)

	if errs != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   err.Error(),
			Message: "Purchase order not found",
		})
		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Updated Purchase order Successfully",
	})
}

// DeletePurchaseOrder - Delete (soft delete) purchase order
func DeletePurchaseOrder(c *gin.Context) {
	poIDstr := c.Param("id")
	var poID uint
	_, err := fmt.Sscanf(poIDstr, "%d", &poID)

	if err != nil || poID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid purchase order ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	ownerID, err := GetPurchaseOrderOwner(poID)
	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   "Purchase order not found",
			Message: "No purchase order with that ID",
		})
		return
	}

	if userRole == "user" && ownerID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You do not have permission to delete this purchase order",
		})
		return
	}

	err = DeletePurchaseOrderDB(poID)

	if err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   err.Error(),
			Message: "Purchase order not found",
		})
		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Deleted Purchase order Successfully",
	})
}

// UpdatePurchaseOrderStatus - Update purchase order status (validator/admin only)
func UpdatePurchaseOrderStatus(c *gin.Context) {
	poIDstr := c.Param("id")
	var poID uint
	_, err := fmt.Sscanf(poIDstr, "%d", &poID)

	if err != nil || poID == 0 {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Error:   "Invalid purchase order ID",
			Message: "ID must be a valid positive number",
		})
		return
	}

	userRole := c.GetString("role")

	if userRole == "user" {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "Only validators and admins can update PO status",
		})
		return
	}

	var poReq PurchaseOrder
	if err := c.BindJSON(&poReq); err != nil {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	if poReq.Status == "" {
		c.JSON(http.StatusBadRequest, JsonResponse{
			Status:  http.StatusBadRequest,
			Message: "Invalid request format",
			Error:   "Status field is required",
		})
		return
	}

	if err := UpdatePurchaseOrderDB(poID, &poReq); err != nil {
		c.JSON(http.StatusNotFound, JsonResponse{
			Status:  http.StatusNotFound,
			Error:   err.Error(),
			Message: "Purchase order not found",
		})
		return
	}

	c.JSON(http.StatusOK, JsonResponse{
		Status:  http.StatusOK,
		Message: "Purchase order status updated successfully",
		Data: map[string]interface{}{
			"id": poID,
		},
	})
}

// GetPurchaseOrdersByCompany - Get all purchase orders for a specific company
func GetPurchaseOrdersByCompany(c *gin.Context) {
	userID := c.GetUint("user_id")
	userRole := c.GetString("role")
	companyIDstr := c.Param("company_id")
	var companyID uint

	_, err := fmt.Sscanf(companyIDstr, "%d", &companyID)
	if err != nil || companyID == 0 {
		companyID = userID
	}

	if userRole == "user" && companyID != userID {
		c.JSON(http.StatusForbidden, JsonResponse{
			Status:  http.StatusForbidden,
			Error:   "Access denied",
			Message: "You can only view your own purchase orders",
		})
		return
	}

	PurchaseOrders, err := GetPurchaseOrdersByCompanyDB(companyID)

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
		Data:    PurchaseOrders,
	})
}
