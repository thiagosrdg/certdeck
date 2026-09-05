import conceptsArt from "../assets/suits/networking-concepts.png";
import implementationArt from "../assets/suits/network-implementation.png";
import operationsArt from "../assets/suits/network-operations.png";
import securityArt from "../assets/suits/network-security.png";
import troubleshootingArt from "../assets/suits/network-troubleshooting.png";
import { certConfig } from "../cert.config";

export interface SuitLookup {
  name: string;
  hue: string;
  src?: string;
}

/**
 * This deck's suit art, one image per domain. Bundled by Vite from the app's
 * own assets, so it is served from this origin and precached with everything
 * else — the app stays usable offline, which the CDN alternative would break.
 */
const ART: Record<string, string> = {
  "1.0": conceptsArt,
  "2.0": implementationArt,
  "3.0": operationsArt,
  "4.0": securityArt,
  "5.0": troubleshootingArt,
};

export function suitFor(domainId: string): SuitLookup {
  const domain = certConfig.domains.find((d) => d.id === domainId);
  return { name: domain?.icon ?? "node", hue: domain?.hue ?? "#999999", src: ART[domainId] };
}

export function domainName(domainId: string): string {
  return certConfig.domains.find((d) => d.id === domainId)?.name ?? domainId;
}
