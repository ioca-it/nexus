export type {
  BusinessCentralInventoryGateway,
  BusinessCentralInventoryItem,
} from './business-central-inventory.types';

// The standard items resource exposes inventory, but not availableQuantity.
// A custom API page is required before a concrete gateway can be implemented.
