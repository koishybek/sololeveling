"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type ToastType = "info" | "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let counter = 0;

/** Fire a transient toast from anywhere on the client. */
export function toast(message: string, type: ToastType = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("erank-toast", { detail: { message, type } }),
  );
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        message: string;
        type: ToastType;
      };
      counter += 1;
      const id = counter;
      setItems((p) => [...p, { id, ...detail }]);
      setTimeout(() => setItems((p) => p.filter((i) => i.id !== id)), 2800);
    };
    window.addEventListener("erank-toast", handler);
    return () => window.removeEventListener("erank-toast", handler);
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto max-w-sm rounded-xl px-4 py-2.5 text-sm shadow-lg [animation:fadeIn_.2s_ease]",
            t.type === "error"
              ? "bg-danger text-base"
              : t.type === "success"
                ? "bg-success text-base"
                : "bg-surface-2 text-fg ring-1 ring-border",
          )}
        >
          {t.message}
        </div>
      ))}
    </div>,
    document.body,
  );
}
