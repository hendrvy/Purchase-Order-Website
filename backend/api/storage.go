package api

import (
	"sync"
)

type Storage struct {
	mu             sync.Mutex
	companies      map[uint]Company         //List nama company
	purchaseOrders map[string]PurchaseOrder //list Purchase order seluruh company
	attachments    map[string]Attachment    //list Attachment seluruh company
}

var storage *Storage
var once sync.Once

func GetStorage() *Storage {
	once.Do(func() {
		storage = &Storage{
			companies:      make(map[uint]Company),
			purchaseOrders: make(map[string]PurchaseOrder),
			attachments:    make(map[string]Attachment),
		}
		// Seed with initial test company
		seedData()
	})
	return storage
}
