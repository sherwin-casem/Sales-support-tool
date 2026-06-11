import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import { sanitizeLeadContacts } from "@/services/domain/enrichment/decision-maker-contact.service.js";

/** Re-validates stored contact fields when serving profiles (covers legacy DB rows). */
export function sanitizeProfileForResponse(
  profile: ExtractedCompany | null | undefined,
): ExtractedCompany | null {
  if (!profile) {
    return null;
  }

  const sanitized = sanitizeLeadContacts(profile);

  // #region agent log
  fetch('http://127.0.0.1:7506/ingest/b8df404c-d358-471e-b660-9eb937c3e500',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0dd8cc'},body:JSON.stringify({sessionId:'0dd8cc',location:'sanitize-profile.ts:sanitizeProfileForResponse',message:'profile contacts sanitized',data:{emailChanged:profile.email!==sanitized.email,dmEmailChanged:profile.decisionMakerEmail!==sanitized.decisionMakerEmail},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
  // #endregion

  return sanitized;
}
