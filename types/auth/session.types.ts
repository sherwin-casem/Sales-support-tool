import type { UserRole } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
}

export interface AuthenticatedUser extends SessionUser {}
