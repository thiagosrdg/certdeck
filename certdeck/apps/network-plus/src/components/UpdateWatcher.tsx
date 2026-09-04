import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { UpdateBanner } from "@certdeck/engine";
import { useExamStore } from "../stores";

/**
 * Registers the service worker and surfaces the waiting build.
 *
 * This has to live in the app rather than the engine: `virtual:pwa-register`
 * is produced by vite-plugin-pwa, which is configured per app, and the
 * landing page has no service worker at all. The engine owns only the banner.
 *
 * Without this the worker still registers — vite-plugin-pwa injects a bare
 * registration — but `skipWaiting()` waits on a `SKIP_WAITING` message that
 * nothing sends, so a new build sits unused until every window of the old one
 * closes. `updateSW(true)` is what sends it.
 */
export function UpdateWatcher() {
  const [dismissed, setDismissed] = useState(false);
  const hasAttemptInFlight = useExamStore((s) => s.attempt !== null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      // Never fatal: a failed registration costs offline support, not the app.
      console.error("Service worker registration failed", error);
    },
  });

  return (
    <UpdateBanner
      open={needRefresh && !dismissed}
      busy={hasAttemptInFlight}
      onUpdate={() => {
        setNeedRefresh(false);
        // `true` sends SKIP_WAITING and reloads once the new worker is active.
        void updateServiceWorker(true);
      }}
      onDismiss={() => setDismissed(true)}
    />
  );
}
