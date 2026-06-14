import { AuthApiService } from "@/services/application/auth-api.service.js";

let cachedService: AuthApiService | undefined;

export function getAuthApiService(): AuthApiService {
  if (!cachedService) {
    cachedService = new AuthApiService();
  }

  return cachedService;
}
