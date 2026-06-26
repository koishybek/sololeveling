"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live 1D barcode scanner (EAN/UPC) using Quagga2.
 * Quagga is imported dynamically so it never runs during SSR.
 */
export function BarcodeScanner({
  onDetected,
}: {
  onDetected: (code: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let quagga: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: ((res: any) => void) | null = null;

    (async () => {
      const mod = await import("@ericblade/quagga2");
      const Quagga = mod.default;
      if (!active || !ref.current) return;
      quagga = Quagga;

      handler = (res) => {
        const code = res?.codeResult?.code;
        if (code) onDetected(String(code));
      };

      const config = {
        inputStream: {
          type: "LiveStream",
          target: ref.current,
          constraints: { facingMode: "environment" },
        },
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "upc_reader",
            "upc_e_reader",
          ],
        },
        locate: true,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Quagga.init(config as any, (err: unknown) => {
        if (!active) return;
        if (err) {
          setError("Нет доступа к камере. Введи код вручную ниже.");
          return;
        }
        Quagga.start();
      });
      Quagga.onDetected(handler);
    })();

    return () => {
      active = false;
      if (quagga) {
        if (handler) quagga.offDetected(handler);
        try {
          quagga.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, [onDetected]);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface-2 p-4 text-center text-sm text-muted">
        {error}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <div ref={ref} className="aspect-[4/3] w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover [&_canvas]:hidden" />
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-accent/80 [animation:pulseGlow_1.2s_ease-in-out_infinite]" />
    </div>
  );
}
