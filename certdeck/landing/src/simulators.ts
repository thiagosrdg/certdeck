export interface SimulatorEntry {
  name: string;
  certName: string;
  examCode: string;
  status: "available" | "in-development" | "planned";
  href: string;
  accent: string;
}

/**
 * The landing page's index of apps. Kept in sync by hand with `apps/` and
 * the deploy workflow's build matrix — see AGENTS.md, "Adding a
 * certification."
 */
export const simulators: SimulatorEntry[] = [
  {
    name: "PacketPrep",
    certName: "CompTIA Network+",
    examCode: "N10-009",
    status: "available",
    href: "./network-plus/",
    accent: "#A32B62",
  },
  {
    name: "Security+ simulator",
    certName: "CompTIA Security+",
    examCode: "SY0-701",
    status: "planned",
    href: "",
    accent: "#9C3D46",
  },
];
