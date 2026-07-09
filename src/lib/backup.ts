"use client";

import { dayKey, exportData, importData, markBackupDone } from "@/lib/db/repo";

/** Export all data to a JSON file, trigger a download, and record the backup. */
export async function downloadBackup(): Promise<void> {
  const json = await exportData();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calora-backup-${dayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  await markBackupDone();
}

/** Read + validate + import a backup file (throws friendly errors on bad input). */
export async function importBackupFile(file: File): Promise<void> {
  const text = await file.text();
  await importData(text);
}
