"use client";

import dynamic from "next/dynamic";

// The whole app is local-first (IndexedDB), so render it client-side only.
const AppRoot = dynamic(() => import("./app-root"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-surface-2 border-t-accent" />
    </main>
  ),
});

export default function Page() {
  return <AppRoot />;
}
