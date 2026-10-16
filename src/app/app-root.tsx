"use client";

import { useEffect, useRef, useState } from "react";
import { requestPersistentStorage } from "@/lib/db/repo";
import { AddEntrySheet, type AddTarget } from "@/features/add-entry/add-entry-sheet";
import { Dashboard } from "@/features/dashboard/dashboard";
import { Foods } from "@/features/foods/foods";
import { Onboarding } from "@/features/onboarding/onboarding";
import { Profile as ProfileScreen } from "@/features/profile/profile";
import { Progress } from "@/features/progress/progress";
import { Icon, type IconName } from "@/components/icons";
import { InstallPrompt } from "@/components/install-prompt";
import { APP_NAME } from "@/lib/app";
import { useProfileState } from "@/lib/hooks";
import { cn } from "@/lib/utils";

type Tab = "diary" | "progress" | "foods" | "me";

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "diary", label: "Дневник", icon: "book" },
  { key: "progress", label: "Прогресс", icon: "chart" },
  { key: "foods", label: "Продукты", icon: "search" },
  { key: "me", label: "Профиль", icon: "user" },
];

export default function AppRoot() {
  const { loading, profile } = useProfileState();
  const [tab, setTab] = useState<Tab>("diary");
  const [add, setAdd] = useState<AddTarget | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Each tab opens at the top (the scroll container is shared).
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [tab]);

  // Ask the browser to keep our IndexedDB from being evicted.
  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  if (loading) return <Splash />;
  if (!profile) return <Onboarding />;

  return (
    <div className="relative mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-base">
      <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-contain pb-32 [-webkit-overflow-scrolling:touch]">
        {tab === "diary" ? (
          <Dashboard profile={profile} onAdd={setAdd} />
        ) : tab === "progress" ? (
          <Progress profile={profile} />
        ) : tab === "foods" ? (
          <Foods />
        ) : (
          <ProfileScreen profile={profile} />
        )}
      </main>

      <BottomNav tab={tab} onTab={setTab} onAdd={() => setAdd({})} />

      <AddEntrySheet target={add} onClose={() => setAdd(null)} />
      <InstallPrompt />
    </div>
  );
}

function BottomNav({
  tab,
  onTab,
  onAdd,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  onAdd: () => void;
}) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  return (
    <nav
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-base via-base/80 to-transparent px-3 pt-6"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/5 bg-surface/90 p-1.5 shadow-lift backdrop-blur-xl">
        {left.map((t) => (
          <TabButton
            key={t.key}
            label={t.label}
            icon={t.icon}
            active={tab === t.key}
            onClick={() => onTab(t.key)}
          />
        ))}
        <button
          onClick={onAdd}
          aria-label="Добавить еду"
          className="mx-1 grid size-[52px] shrink-0 place-items-center rounded-full bg-accent text-on-accent shadow-[0_6px_18px_rgba(68,214,96,0.35)] transition active:scale-95"
        >
          <Icon name="plus" size={26} strokeWidth={2.6} />
        </button>
        {right.map((t) => (
          <TabButton
            key={t.key}
            label={t.label}
            icon={t.icon}
            active={tab === t.key}
            onClick={() => onTab(t.key)}
          />
        ))}
      </div>
    </nav>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 transition",
        active ? "bg-surface-3 text-fg" : "text-muted",
      )}
    >
      <Icon name={icon} size={21} />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

function Splash() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="grid size-16 place-items-center rounded-[16px] bg-accent text-on-accent shadow-card">
        <Icon name="leaf" size={30} />
      </div>
      <div className="text-lg font-bold tracking-tight">{APP_NAME}</div>
      <div className="size-6 animate-spin rounded-full border-2 border-track border-t-accent" />
    </main>
  );
}
