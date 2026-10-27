import { z } from "zod";

export const participantSchema = z.object({
  full_name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Invalid email").max(120).or(z.literal("")).nullish().transform((v) => v || null),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number").or(z.literal("")).nullish().transform((v) => v || null),
  bag_number: z.string().trim().toUpperCase().max(40, "Bag number is too long").nullish().transform((v) => v || null),
  bag_quantity: z.coerce.number().int().min(1).max(50).default(1),
  waste_kg: z.coerce.number().min(0.25).max(500).default(1),
  inventory_items: z.array(z.string().trim().min(1).max(40)).max(50).default([]),
});
export type ParticipantInput = z.input<typeof participantSchema>;
export type ParticipantData = z.output<typeof participantSchema>;

export function zodFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
