package api

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
)

// PaginationMeta describes which slice of a larger result set the `items`
// in a paginated response represent. Shared by every list endpoint so the
// frontend can render pagination controls from a single, consistent shape.
type PaginationMeta struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// PaginatedData is the `data` payload of a paginated list response.
type PaginatedData struct {
	Items interface{}    `json:"items"`
	Meta  PaginationMeta `json:"meta"`
}

// parsePagination reads ?page= and ?limit=. Defaults and the 100-row cap on
// limit are enforced by queryInt (see handlers.go).
func parsePagination(c *gin.Context) (page int, limit int) {
	return queryInt(c, "page", 1), queryInt(c, "limit", 10)
}

// buildMeta derives the total page count for a given page/limit.
func buildMeta(page, limit int, total int64) PaginationMeta {
	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}
	return PaginationMeta{
		Page:       page,
		PageSize:   limit,
		Total:      total,
		TotalPages: totalPages,
	}
}

// parseSort validates the ?sort= and ?order= query params against an
// allow-list of field keys and returns the whitelisted SQL column plus a
// sanitized direction ("asc"/"desc"). The column is never taken verbatim
// from the request, so this doubles as protection against SQL injection via
// the ORDER BY clause. Unknown sort fields or directions are rejected so the
// handler can respond with 400 instead of silently ignoring them.
func parseSort(c *gin.Context, allowed map[string]string, defaultColumn, defaultDirection string) (column string, direction string, err error) {
	sortKey := strings.TrimSpace(c.Query("sort"))
	if sortKey == "" {
		column = defaultColumn
	} else {
		mapped, ok := allowed[sortKey]
		if !ok {
			return "", "", fmt.Errorf("invalid sort field '%s'", sortKey)
		}
		column = mapped
	}

	direction = strings.ToLower(strings.TrimSpace(c.Query("order")))
	if direction == "" {
		direction = defaultDirection
	}
	if direction != "asc" && direction != "desc" {
		return "", "", fmt.Errorf("invalid order '%s' (expected 'asc' or 'desc')", direction)
	}

	return column, direction, nil
}
