import { certConfig } from "../cert.config";

export interface SuitLookup {
  name: string;
  hue: string;
}

export function suitFor(domainId: string): SuitLookup {
  const domain = certConfig.domains.find((d) => d.id === domainId);
  return { name: domain?.icon ?? "node", hue: domain?.hue ?? "#999999" };
}

export function domainName(domainId: string): string {
  return certConfig.domains.find((d) => d.id === domainId)?.name ?? domainId;
}
