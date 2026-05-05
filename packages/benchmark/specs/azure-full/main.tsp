import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using Http;
using Rest;
using Versioning;
using Azure.Core;
using Azure.Core.Traits;

// ============================================
// A comprehensive data-plane service with many models, operations, and patterns
// ============================================

@service(#{ title: "Contoso Benchmark Full Service" })
@versioned(Contoso.BenchmarkFull.Versions)
@useAuth(ApiKeyAuth<ApiKeyLocation.header, "X-Api-Key">)
namespace Contoso.BenchmarkFull;

enum Versions {
  `2024-01-01`,
}

// --- Catalog domain ---

union ItemCategory {
  string,
  Electronics: "Electronics",
  Furniture: "Furniture",
  Clothing: "Clothing",
  Food: "Food",
  Books: "Books",
  Sports: "Sports",
}

union ItemCondition {
  string,
  New: "New",
  Refurbished: "Refurbished",
  Used: "Used",
}

@resource("items")
model Item {
  @key("itemId")
  @visibility(Lifecycle.Read)
  id: string;

  name: string;
  description?: string;
  category: ItemCategory;
  condition: ItemCondition;
  price: float64;
  quantity: int32;
  sku: string;
  tags?: Record<string>;
  metadata?: Record<string>;
  createdAt: utcDateTime;
  updatedAt?: utcDateTime;
  ...EtagProperty;
}

@resource("reviews")
@parentResource(Item)
model ItemReview {
  @key("reviewId")
  @visibility(Lifecycle.Read)
  id: string;

  author: string;
  rating: int32;
  title?: string;
  comment?: string;
  helpful: int32;
  createdAt: utcDateTime;
}

@resource("images")
@parentResource(Item)
model ItemImage {
  @key("imageId")
  @visibility(Lifecycle.Read)
  id: string;

  url: string;
  altText?: string;
  width: int32;
  height: int32;
  isPrimary: boolean;
}

// --- Order domain ---

@resource("orders")
model Order {
  @key("orderId")
  @visibility(Lifecycle.Read)
  id: string;

  customerName: string;
  customerEmail: string;
  shippingAddress: Address;
  billingAddress?: Address;
  items: OrderLineItem[];
  totalAmount: float64;
  currency: string;
  status: OrderStatus;
  createdAt: utcDateTime;
  updatedAt?: utcDateTime;
  ...EtagProperty;
}

model Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

model OrderLineItem {
  itemId: string;
  itemName: string;
  quantity: int32;
  unitPrice: float64;
  discount?: float64;
}

union OrderStatus {
  string,
  Pending: "Pending",
  Confirmed: "Confirmed",
  Processing: "Processing",
  Shipped: "Shipped",
  Delivered: "Delivered",
  Canceled: "Canceled",
  Refunded: "Refunded",
}

@resource("shipments")
@parentResource(Order)
model Shipment {
  @key("shipmentId")
  @visibility(Lifecycle.Read)
  id: string;

  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  estimatedDelivery?: utcDateTime;
  shippedAt?: utcDateTime;
  deliveredAt?: utcDateTime;
}

union ShipmentStatus {
  string,
  Pending: "Pending",
  InTransit: "InTransit",
  OutForDelivery: "OutForDelivery",
  Delivered: "Delivered",
  Failed: "Failed",
}

// --- Customer domain ---

@resource("customers")
model Customer {
  @key("customerId")
  @visibility(Lifecycle.Read)
  id: string;

  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: Address;
  loyaltyTier: LoyaltyTier;
  createdAt: utcDateTime;
  ...EtagProperty;
}

union LoyaltyTier {
  string,
  Bronze: "Bronze",
  Silver: "Silver",
  Gold: "Gold",
  Platinum: "Platinum",
}

@resource("wishlists")
@parentResource(Customer)
model WishlistItem {
  @key("wishlistItemId")
  @visibility(Lifecycle.Read)
  id: string;

  itemId: string;
  addedAt: utcDateTime;
  note?: string;
}

// --- Analytics ---

model SalesReport {
  period: string;
  totalRevenue: float64;
  totalOrders: int32;
  averageOrderValue: float64;
  topCategories: CategorySales[];
}

model CategorySales {
  category: ItemCategory;
  revenue: float64;
  unitsSold: int32;
}

model InventoryAlert {
  itemId: string;
  itemName: string;
  currentQuantity: int32;
  threshold: int32;
  severity: AlertSeverity;
}

union AlertSeverity {
  string,
  Low: "Low",
  Medium: "Medium",
  High: "High",
  Critical: "Critical",
}

model InventoryAlertList {
  alerts: InventoryAlert[];
}

// --- Operations ---

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Ops = Azure.Core.ResourceOperations<ServiceTraits>;

interface Items {
  create is Ops.ResourceCreateWithServiceProvidedName<Item>;
  get is Ops.ResourceRead<Item>;
  delete is Ops.ResourceDelete<Item>;
  list is Ops.ResourceList<
    Item,
    ListQueryParametersTrait<StandardListQueryParameters & SelectQueryParameter>
  >;
}

interface ItemReviews {
  create is Ops.ResourceCreateWithServiceProvidedName<ItemReview>;
  get is Ops.ResourceRead<ItemReview>;
  list is Ops.ResourceList<ItemReview>;
}

interface ItemImages {
  create is Ops.ResourceCreateWithServiceProvidedName<ItemImage>;
  get is Ops.ResourceRead<ItemImage>;
  delete is Ops.ResourceDelete<ItemImage>;
  list is Ops.ResourceList<ItemImage>;
}

interface Orders {
  create is Ops.ResourceCreateWithServiceProvidedName<Order>;
  get is Ops.ResourceRead<Order>;
  list is Ops.ResourceList<Order, ListQueryParametersTrait<StandardListQueryParameters>>;
}

interface Shipments {
  create is Ops.ResourceCreateWithServiceProvidedName<Shipment>;
  get is Ops.ResourceRead<Shipment>;
  list is Ops.ResourceList<Shipment>;
}

interface Customers {
  create is Ops.ResourceCreateWithServiceProvidedName<Customer>;
  get is Ops.ResourceRead<Customer>;
  delete is Ops.ResourceDelete<Customer>;
  list is Ops.ResourceList<Customer, ListQueryParametersTrait<StandardListQueryParameters>>;
}

interface WishlistItems {
  create is Ops.ResourceCreateWithServiceProvidedName<WishlistItem>;
  get is Ops.ResourceRead<WishlistItem>;
  delete is Ops.ResourceDelete<WishlistItem>;
  list is Ops.ResourceList<WishlistItem>;
}

@route("analytics/sales")
op getSalesReport is RpcOperation<
  {
    @query period: string;
  },
  SalesReport,
  ServiceTraits
>;

@route("analytics/inventory-alerts")
op getInventoryAlerts is RpcOperation<
  {
    @query severity?: string;
  },
  InventoryAlertList,
  ServiceTraits
>;

@route("service-status")
op getServiceStatus is RpcOperation<
  {},
  {
    status: string;
    version: string;
    uptime: int64;
  },
  ServiceTraits
>;
