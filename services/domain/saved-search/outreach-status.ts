import type { CampaignStatus, RecipientStatus } from "@prisma/client";
import type { SavedSearchOutreachStatus } from "@/types/repositories/saved-search.repository.types.js";

const TERMINAL_RECIPIENT_STATUSES = new Set<RecipientStatus>([
  "SENT",
  "DELIVERED",
  "OPENED",
  "CLICKED",
  "REPLIED",
  "BOUNCED",
]);

const ACTIVE_CAMPAIGN_STATUSES = new Set<CampaignStatus>([
  "DRAFT",
  "SCHEDULED",
  "RUNNING",
  "PAUSED",
]);

export function computeSavedSearchOutreachStatus(
  recipients: Array<{ status: RecipientStatus; campaignStatus: CampaignStatus }>,
): SavedSearchOutreachStatus {
  if (recipients.length === 0) {
    return "NOT_STARTED";
  }

  const hasPendingRecipient = recipients.some((recipient) => recipient.status === "PENDING");
  const hasActiveCampaign = recipients.some((recipient) =>
    ACTIVE_CAMPAIGN_STATUSES.has(recipient.campaignStatus),
  );
  const allRecipientsTerminal = recipients.every((recipient) =>
    TERMINAL_RECIPIENT_STATUSES.has(recipient.status),
  );

  if (allRecipientsTerminal && !hasActiveCampaign) {
    return "COMPLETED";
  }

  if (hasPendingRecipient || hasActiveCampaign) {
    return "IN_PROGRESS";
  }

  return "IN_PROGRESS";
}

export function outreachStatusLabel(status: SavedSearchOutreachStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
  }
}
