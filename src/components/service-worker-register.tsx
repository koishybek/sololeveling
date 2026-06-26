"use client";

import { useEffect } from "react";

/** Registers the PWA service worker on the client (no-op on the server). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal */
      });
    }
  }, []);

  return null;
}
