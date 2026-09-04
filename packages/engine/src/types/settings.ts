import { z } from "zod";

export const ThemeSchema = z.enum(["light", "dark", "system"]);
export type Theme = z.infer<typeof ThemeSchema>;

export const SettingsSchema = z.object({
  theme: ThemeSchema.default("system"),
  passThreshold: z.number().min(0).max(1).nullable().default(null),
  timerEnabledInPractice: z.boolean().default(false),
  shuffleOptions: z.boolean().default(true),
  cardFlipEnabled: z.boolean().default(true),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});
