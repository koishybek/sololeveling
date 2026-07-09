"use client";

import { useEffect, useState } from "react";
import { requestPersistentStorage } from "@/lib/db/repo";
import { AddEntrySheet } from "@/features/add-entry/add-entry-sheet";
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
  { key: "diary", label: "Дневник", icon: "home" },
  { key: "progress", label: "Прогресс", icon: "chart" },
  { key: "foods", label: "Продукты", icon: "search" },
  { key: "me", label: "Профиль", icon: "user" },
];

export default function AppRoot() {
  const { loading, profile } = useProfileState();
  const [tab, setTab] = useState<Tab>("diary");
  const [addOpen, setAddOpen] = useState(false);

  // Ask the browser to keep our IndexedDB from being evicted.
  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  if (loading) return <Splash />;
  if (!profile) return <Onboarding />;

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-base">
      <main className="flex-1 overflow-y-auto overscroll-contain pb-4 [-webkit-overflow-scrolling:touch]">
        {tab === "diary" ? (
          <Dashboard profile={profile} />
        ) : tab === "progress" ? (
          <Progress profile={profile} />
        ) : tab === "foods" ? (
          <Foods />
        ) : (
          <ProfileScreen profile={profile} />
        )}
      </main>

      <BottomNav tab={tab} onTab={setTab} onAdd={() => setAddOpen(true)} />

      <AddEntrySheet open={addOpen} onClose={() => setAddOpen(false)} />
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
      className="relative z-40 shrink-0 px-4 pt-1"
      style={{ paddingBottom: "max(0.6rem, env(safe-area-inset-bottom))" }}
    >
      <div className="relative flex items-center justify-between rounded-[24px] border border-border bg-surface px-2 py-3 shadow-card">
        {left.map((t) => (
          <TabButton
            key={t.key}
            label={t.label}
            icon={t.icon}
            active={tab === t.key}
            onClick={() => onTab(t.key)}
          />
        ))}
        <div className="w-14 shrink-0" aria-hidden />
        {right.map((t) => (
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
          className="absolute left-1/2 top-0 grid size-14 -translate-x-1/2 -translate-y-3.5 place-items-center rounded-full border-4 border-base bg-accent text-white shadow-[0_6px_16px_rgba(95,184,142,0.4)] transition active:scale-95"
        >
          <Icon name="plus" size={26} strokeWidth={2.6} />
        </button>
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
      className={cn(
        "flex flex-1 flex-col items-center gap-1 transition",
        active ? "text-accent" : "text-muted",
      )}
    >
      <Icon name={icon} size={22} />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

function Splash() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="grid size-16 place-items-center rounded-[16px] bg-accent text-white shadow-card">
        <Icon name="leaf" size={30} />
      </div>
      <div className="text-lg font-bold tracking-tight">{APP_NAME}</div>
      <div className="size-6 animate-spin rounded-full border-2 border-track border-t-accent" />
    </main>
  );
}
