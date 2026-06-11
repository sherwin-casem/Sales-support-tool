import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import { displayValue, isDisplayEmpty } from "@/lib/results/display-fields.js";
import {
  validatePersonalEmail,
  validatePhone,
} from "@/lib/validations/lead-contact.validation.js";

export interface DecisionMakerContact {
  name: string;
  email: string | null;
  phone: string | null;
  linkedInUrl: string | null;
}

export function resolveDecisionMakerContact(
  profile: ExtractedCompany | null | undefined,
): DecisionMakerContact | null {
  if (!profile || isDisplayEmpty(profile.decisionMaker)) {
    return null;
  }

  const rawEmail = profile.decisionMakerEmail ?? null;
  const resolvedEmail = validatePersonalEmail(rawEmail, profile.email ?? null);

  // #region agent log
  fetch('http://127.0.0.1:7506/ingest/b8df404c-d358-471e-b660-9eb937c3e500',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0dd8cc'},body:JSON.stringify({sessionId:'0dd8cc',location:'decision-maker-contact.ts:resolveDecisionMakerContact',message:'dm email resolved',data:{hadRawEmail:Boolean(rawEmail?.trim()),resolvedEmail:Boolean(resolvedEmail),rawDiffersFromResolved:Boolean(rawEmail?.trim())&&resolvedEmail===null},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  return {
    name: displayValue(profile.decisionMaker),
    email: resolvedEmail,
    phone: validatePhone(profile.decisionMakerPhone),
    linkedInUrl: profile.decisionMakerLinkedInUrl ?? null,
  };
}

export function hasDecisionMakerContactDetails(contact: DecisionMakerContact): boolean {
  return Boolean(contact.email?.trim() || contact.phone?.trim() || contact.linkedInUrl?.trim());
}
