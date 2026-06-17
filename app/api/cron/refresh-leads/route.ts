import { withCronHandler } from "@/lib/api/cron-handler.js";
import { getLeadRefreshService } from "@/services/application/lead-refresh.service";

export const POST = withCronHandler(
  () => getLeadRefreshService().processDueSchedules(),
  { route: "/api/cron/refresh-leads" },
);
