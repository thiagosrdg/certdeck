import { CertConfigSchema, type CertConfig } from "@certdeck/engine";

/**
 * The Network+ deck's certification definition — the only place
 * facts (exam code, domain names, weights, colours) are allowed to live.
 * Parsed through the engine's schema so a mistake here (counts that don't
 * sum to questionsPerExam, a duplicate domain id) fails loudly at startup
 * instead of silently generating a wrong exam.
 */
export const certConfig: CertConfig = CertConfigSchema.parse({
  id: "network-plus",
  appName: "CertDeck",
  certName: "CompTIA Network+",
  examCode: "N10-009",
  questionsPerExam: 90,
  timeLimitMinutes: 90,
  passThreshold: 0.8,
  accentHue: "#7B2FA8",
  domains: [
    { id: "1.0", name: "Networking Concepts", weight: 0.23, count: 21, hue: "#3B6EA5", icon: "node" },
    { id: "2.0", name: "Network Implementation", weight: 0.2, count: 18, hue: "#2E8B57", icon: "link" },
    { id: "3.0", name: "Network Operations", weight: 0.19, count: 17, hue: "#6B4FA0", icon: "wave" },
    { id: "4.0", name: "Network Security", weight: 0.14, count: 13, hue: "#9C3D46", icon: "shield" },
    { id: "5.0", name: "Network Troubleshooting", weight: 0.24, count: 21, hue: "#C0762B", icon: "wrench" },
  ],
} satisfies CertConfig);
