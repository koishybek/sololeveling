"use client";

import { useState } from "react";
import { AddEntrySheet } from "@/features/add-entry/add-entry-sheet";
import { Character } from "@/features/character/character";
import { LevelUpWatcher } from "@/features/character/level-up-watcher";
import { Dashboard } from "@/features/dashboard/dashboard";
import { Onboarding } from "@/features/onboarding/onboarding";
import { Progress } from "@/features/progress/progress";
import { useProfileState } from "@/lib/hooks";
import { cn } from "@/lib/utils";

type Tab = "home" | "status" | "progress";

export default function AppRoot() {
  const { loading, profile } = useProfileState();
  const [tab, setTab] = useState<Tab>("home");
  const [addOpen, setAddOpen] = useState(false);

  if (loading) return <Splash />;
  if (!profile) return <Onboarding />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="flex-1 pb-28">
        {tab === "home" ? (
          <Dashboard profile={profile} />
        ) : tab === "status" ? (
          <Character profile={profile} />
        ) : (
          <Progress profile={profile} />
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center justify-around border-t border-border bg-surface/90 px-6 backdrop-blur"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))", paddingTop: "0.5rem" }}
      >
        <TabButton active={tab === "home"} onClick={() => setTab("home")} label="Дневник" icon="📒" />
        <TabButton active={tab === "status"} onClick={() => setTab("status")} label="Статус" icon="⚔️" />

        <button
          onClick={() => setAddOpen(true)}
          aria-label="Добавить еду"
          className="grid size-14 -translate-y-4 place-items-center rounded-full bg-accent text-2xl text-base shadow-lg shadow-accent/30 transition active:scale-95"
        >
          +
        </button>

        <TabButton active={tab === "progress"} onClick={() => setTab("progress")} label="Прогресс" icon="📈" />
      </nav>

      <AddEntrySheet open={addOpen} onClose={() => setAddOpen(false)} />
      <LevelUpWatcher profile={profile} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 text-xs transition",
        active ? "text-accent" : "text-muted",
      )}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

function Splash() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="grid size-16 place-items-center rounded-2xl bg-accent/15 text-2xl font-bold text-accent ring-1 ring-accent/40">
        E
      </div>
      <div className="size-6 animate-spin rounded-full border-2 border-surface-2 border-t-accent" />
    </main>
  );
}
