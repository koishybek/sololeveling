"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/db";
import { snoozeBackupReminder } from "@/lib/db/repo";
import { downloadBackup } from "@/lib/backup";
import { Icon } from "./icons";
import { toast } from "./toast";

const DAY = 86_400_000;

/**
 * Gentle, dismissible card that appears when the user has meaningful data
 * (>=5 entries) and hasn't backed up in over a week. IndexedDB can be evicted
 * by the browser, so this is the safety net — one tap to a JSON download.
 */
export function BackupReminder() {
  const data = useLiveQuery(async () => {
    const settings = await db.settings.get("app");
    const count = await db.logEntries.count();
    const profile = await db.profile.get("me");
    return { settings, count, createdAt: profile?.createdAt ?? Date.now() };
  });
  if (!data) return null;

  const { settings, count, createdAt } = data;
  const since = settings?.lastBackupAt ?? createdAt;
  const days = (Date.now() - since) / DAY;
  const snoozedRecently =
    Date.now() - (settings?.backupReminderSnoozedAt ?? 0) < 3 * DAY;
  if (count < 5 || days <= 7 || snoozedRecently) return null;

  async function backup() {
    try {
      await downloadBackup();
      toast("Резервная копия скачана", "success");
    } catch {
      toast("Не удалось скачать бэкап", "error");
    }
  }

  return (
    <div className="mb-4 rounded-2xl bg-carb-soft p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#C8871F]">
          <Icon name="download" size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">Сохрани свои данные</div>
          <div className="mt-0.5 text-[12px] leading-snug text-muted">
            История хранится только на этом телефоне. Скачай резервную копию, чтобы
            не потерять её при очистке браузера.
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={backup}
              className="rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white transition active:scale-95"
            >
              Скачать бэкап
            </button>
            <button
              onClick={() => void snoozeBackupReminder()}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted"
            >
              Позже
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
