/**
 * Browser API calls authenticate via NextAuth session cookies.
 * Bearer tokens remain supported for external API clients via lib/api/auth.ts.
 */
export function getClientAuthorizationHeader(): string | undefined {
  return undefined;
}
