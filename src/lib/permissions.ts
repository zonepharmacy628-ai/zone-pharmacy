export const PERMISSIONS = {
  view_orders: "View Orders",
  manage_orders: "Manage Orders",
  manage_products: "Add/Edit Products",
  manage_stock: "Manage Stock",
  create_purchases: "Create Purchases",
  view_purchases: "View Purchase Invoices",
  manage_suppliers: "Manage Suppliers",
  view_reports: "View Sales Reports",
  manage_requests: "Manage Medicine Requests & Prescriptions",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const STAFF_ROLES = {
  manager: "Manager",
  pharmacist: "Pharmacist",
  sales: "Sales Staff",
  inventory: "Inventory Staff",
} as const;

export type StaffRole = keyof typeof STAFF_ROLES;
export type Role = "customer" | "owner" | StaffRole;

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  owner: "Owner",
  ...STAFF_ROLES,
};

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, Permission[]> = {
  manager: [
    "view_orders",
    "manage_orders",
    "manage_products",
    "manage_stock",
    "create_purchases",
    "view_purchases",
    "view_reports",
  ],
  pharmacist: ["view_orders", "manage_orders", "manage_products", "manage_requests"],
  sales: ["view_orders", "manage_orders", "view_reports"],
  inventory: ["manage_products", "manage_stock", "create_purchases", "view_purchases", "manage_suppliers"],
};

export function isStaffRole(role: string): boolean {
  return role === "owner" || role in STAFF_ROLES;
}

type Actor = { role: string; permissions: string[] };

/** Owner can do everything; staff only what they were explicitly granted. */
export function can(user: Actor | null | undefined, ...anyOf: Permission[]): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  if (!isStaffRole(user.role)) return false;
  return anyOf.some((p) => user.permissions.includes(p));
}
