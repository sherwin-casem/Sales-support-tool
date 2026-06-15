import { z } from "zod";

export const OutreachChannelSchema = z.enum(["EMAIL", "WHATSAPP", "LINKEDIN"]);

export const CreateCampaignSchema = z
  .object({
    name: z.string().min(1).max(200),
    channel: OutreachChannelSchema.default("EMAIL"),
    subject: z.string().max(500).default(""),
    bodyHtml: z.string().default(""),
    bodyText: z.string().min(1),
    companyIds: z.array(z.string().uuid()).optional(),
    searchResultIds: z.array(z.string().uuid()).optional(),
    outreachMessageId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.channel === "EMAIL" && !value.subject.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Subject is required for email campaigns",
        path: ["subject"],
      });
    }

    if (value.channel === "EMAIL" && !value.bodyHtml.trim() && !value.bodyText.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "bodyHtml or bodyText is required for email campaigns",
        path: ["bodyHtml"],
      });
    }
  });

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

export const ScheduleCampaignSchema = z.object({
  scheduledAt: z.string().datetime(),
});

export type ScheduleCampaignInput = z.infer<typeof ScheduleCampaignSchema>;
