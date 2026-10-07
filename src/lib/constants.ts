export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_METHODS = ["cod", "jazzcash", "bank"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  jazzcash: "JazzCash",
  bank: "Bank Transfer",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Awaiting verification",
  paid: "Paid",
};

export const REQUEST_STATUSES = ["new", "in_review", "available", "unavailable", "closed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  in_review: "In Review",
  available: "Available",
  unavailable: "Unavailable",
  closed: "Closed",
};

export const ADDRESS_LABELS = { home: "Home", office: "Office", other: "Other" } as const;

/** Days before expiry at which a product/batch counts as "Expiring Soon". */
export const EXPIRING_SOON_DAYS = 90;

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_CART_QTY = 50;

export type ActionResult<T = undefined> = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: T;
};
