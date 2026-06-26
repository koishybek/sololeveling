"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/db/db";
import type { Profile } from "@/lib/db/types";
import { useGameView } from "@/lib/hooks";

/**
 * Watches the derived game level and shows a celebration overlay when it
 * increases. The baseline is stored in settings so it only fires on real ups.
 */
export function LevelUpWatcher({ profile }: { profile: Profile }) {
  const game = useGameView(profile);
  const [celebrate, setCelebrate] = useState<{ level: number; rank: string } | null>(
    null,
  );

  const level = game?.level;
  useEffect(() => {
    if (!game || level === undefined) return;
    (async () => {
      const s = await db.settings.get("app");
      if (s?.lastSeenLevel === undefined) {
        // first run — record baseline silently
        await db.settings.put({
          id: "app",
          theme: "dark",
          units: "metric",
          aiVisionModel: s?.aiVisionModel ?? "gpt-4o",
          aiTextModel: s?.aiTextModel,
          waterTargetMl: s?.waterTargetMl,
          remindersEnabled: s?.remindersEnabled,
          lastSeenLevel: game.level,
          lastSeenRank: game.rank,
        });
        return;
      }
      if (game.level > s.lastSeenLevel) {
        setCelebrate({ level: game.level, rank: game.rank });
        await db.settings.update("app", {
          lastSeenLevel: game.level,
          lastSeenRank: game.rank,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  if (!celebrate) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/85 backdrop-blur-sm"
      onClick={() => setCelebrate(null)}
    >
      <div className="flex flex-col items-center gap-4 px-8 text-center [animation:fadeIn_.3s_ease]">
        <div className="text-xs tracking-[0.5em] text-accent/80">LEVEL UP</div>
        <div className="grid size-28 place-items-center rounded-3xl bg-accent/15 text-6xl font-bold text-accent ring-2 ring-accent/60 shadow-[0_0_50px_-6px_var(--color-accent)]">
          {celebrate.rank}
        </div>
        <div className="text-2xl font-bold">Уровень {celebrate.level}</div>
        <div className="text-sm text-muted">
          Ранг {celebrate.rank} · ты стал сильнее
        </div>
        <div className="mt-2 text-xs text-muted">нажми, чтобы закрыть</div>
      </div>
    </div>,
    document.body,
  );
}
