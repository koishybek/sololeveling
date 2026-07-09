"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";
import { Icon } from "./icons";
import { APP_NAME } from "@/lib/app";

const DAY = 86_400_000;
const KEY = "calora-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "other";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

/**
 * Custom "Add to Home Screen" prompt. Shows only in-browser (never as an
 * installed PWA), with platform-specific steps. On Android it wires the native
 * `beforeinstallprompt`; on iOS Safari it shows the Share-sheet instructions.
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [canNativePrompt, setCanNativePrompt] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const dismissedAt = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - dismissedAt < 14 * DAY) return;

    const plat = detectPlatform();
    if (plat === "other") return; // desktop — skip the mobile install nudge
    setPlatform(plat);

    const onBip = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanNativePrompt(true);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS never fires beforeinstallprompt; nudge after the user has settled in.
    const t = setTimeout(() => setVisible(true), plat === "ios" ? 5000 : 8000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      clearTimeout(t);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(KEY, String(Date.now()));
    setVisible(false);
  }

  async function nativeInstall() {
    const e = deferred.current;
    if (!e) return dismiss();
    await e.prompt();
    try {
      await e.userChoice;
    } catch {
      /* ignore */
    }
    deferred.current = null;
    dismiss();
  }

  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col justify-end [animation:fadeIn_.2s_ease]">
      <button
        aria-label="Закрыть"
        onClick={dismiss}
        className="absolute inset-0 cursor-default bg-[rgba(46,46,51,0.35)] backdrop-blur-md"
      />
      <div
        className="relative z-10 mx-auto w-full max-w-md rounded-t-sheet bg-surface px-6 pt-3.5 [animation:sheetUp_.28s_cubic-bezier(.2,.8,.2,1)]"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-5 h-[5px] w-[38px] rounded-full bg-[#DBD9D1]" />
        <div className="flex flex-col items-center text-center">
          <div className="grid size-14 place-items-center rounded-[16px] bg-accent text-white shadow-card">
            <Icon name="leaf" size={28} />
          </div>
          <h2 className="mt-3 text-[22px] font-bold">Установи {APP_NAME}</h2>
          <p className="mt-1 max-w-[300px] text-[14px] text-muted">
            Добавь на экран «Домой» — открывается как приложение, работает офлайн.
          </p>
        </div>

        {platform === "android" && canNativePrompt ? (
          <Button className="mt-6 w-full" onClick={nativeInstall}>
            <Icon name="download" size={18} /> Установить
          </Button>
        ) : platform === "ios" ? (
          <div className="mt-5 space-y-2.5">
            <Step n={1}>
              Нажми <Icon name="share" size={16} className="mx-1 inline text-accent-hover" />{" "}
              «Поделиться» внизу Safari
            </Step>
            <Step n={2}>Выбери «На экран „Домой“»</Step>
            <Step n={3}>Нажми «Добавить» — готово ✅</Step>
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            <Step n={1}>
              Открой меню <Icon name="dots" size={16} className="mx-1 inline text-accent-hover" /> в браузере
            </Step>
            <Step n={2}>Выбери «Установить приложение» / «Добавить на главный экран»</Step>
          </div>
        )}

        <button
          onClick={dismiss}
          className="mt-4 w-full py-2 text-[14px] font-medium text-muted"
        >
          Не сейчас
        </button>
      </div>
    </div>,
    document.body,
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-bold text-white">
        {n}
      </span>
      <span className="text-[14px]">{children}</span>
    </div>
  );
}
