import type { CertConfig, Settings } from "@certdeck/engine";
import { certConfig } from "../cert.config";

/** Applies the user's pass-threshold override (Settings) on top of the cert's default. */
export function effectiveConfig(settings: Settings): CertConfig {
  return settings.passThreshold != null ? { ...certConfig, passThreshold: settings.passThreshold } : certConfig;
}
