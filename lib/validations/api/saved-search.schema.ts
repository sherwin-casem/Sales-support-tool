import { z } from "zod";

export const SaveSavedSearchSchema = z.object({
  searchJobId: z.string().uuid(),
});

export type SaveSavedSearchInput = z.infer<typeof SaveSavedSearchSchema>;
