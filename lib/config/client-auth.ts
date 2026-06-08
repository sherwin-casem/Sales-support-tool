const DEFAULT_DEV_USER_ID = "00000000-0000-4000-8000-000000000001";

export function getClientUserId(): string {
  const configured = process.env.NEXT_PUBLIC_DEV_USER_ID;

  if (process.env.NODE_ENV === "production" && !configured) {
    throw new Error(
      "Client auth is not configured for production. Set NEXT_PUBLIC_DEV_USER_ID only for staging, or migrate to session-based auth.",
    );
  }

  return configured ?? DEFAULT_DEV_USER_ID;
}

export function getClientAuthorizationHeader(): string {
  return `Bearer ${getClientUserId()}`;
}
