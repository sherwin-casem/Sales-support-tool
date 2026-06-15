import { ApiError } from "@/lib/api/api-error.js";
import type { UserRole } from "@prisma/client";

export const PERMISSIONS = {
  "search:create": ["ADMIN", "MANAGER", "SALES_REP"],
  "search:read": ["ADMIN", "MANAGER", "SALES_REP"],
  "campaign:create": ["ADMIN", "MANAGER", "SALES_REP"],
  "campaign:read": ["ADMIN", "MANAGER", "SALES_REP"],
  "campaign:send": ["ADMIN", "MANAGER", "SALES_REP"],
  "outreach:generate": ["ADMIN", "MANAGER", "SALES_REP"],
  "analytics:read": ["ADMIN", "MANAGER"],
  "user:manage": ["ADMIN"],
  "org:services:edit": ["ADMIN"],
  "refresh:manage": ["ADMIN", "MANAGER", "SALES_REP"],
  "saved-search:read": ["ADMIN", "MANAGER", "SALES_REP"],
  "saved-search:write": ["ADMIN", "MANAGER", "SALES_REP"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw ApiError.forbidden(`Role ${role} lacks permission ${permission}`);
  }
}
