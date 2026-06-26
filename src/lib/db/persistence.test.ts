import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import {
  addLogEntry,
  dayKey,
  getEntriesForDate,
  getProfile,
  getRecentFoods,
  saveProfile,
  sumEntries,
  upsertFood,
} from "./repo";
import type { Profile } from "./types";

const profile: Profile = {
  id: "me",
  sex: "male",
  age: 20,
  heightCm: 180,
  weightKg: 100,
  targetWeightKg: 85,
  activity: "sedentary",
  goal: "lose",
  dailyAdjustmentKcal: 500,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("persistence (real Dexie against fake-indexeddb)", () => {
  beforeEach(async () => {
    await db.logEntries.clear();
    await db.foods.clear();
    await db.profile.clear();
  });

  it("writes a meal to storage and reads it back with correct macros", async () => {
    const food = await upsertFood({
      name: "Куриная грудка",
      source: "usda",
      per100g: { kcal: 165, proteinG: 31, carbG: 0, fatG: 3.6 },
      isWholeFood: true,
    });
    await addLogEntry({ food, grams: 200, meal: "lunch" });

    // read back from the DB (not from memory)
    const entries = await getEntriesForDate(dayKey());
    expect(entries).toHaveLength(1);
    expect(entries[0].foodName).toBe("Куриная грудка");
    expect(entries[0].grams).toBe(200);
    expect(entries[0].kcal).toBe(330); // 165 * 2

    const totals = sumEntries(entries);
    expect(totals.kcal).toBe(330);
    expect(totals.proteinG).toBe(62);
  });

  it("accumulates multiple meals across the day", async () => {
    const eggs = await upsertFood({
      name: "Яйцо",
      source: "usda",
      per100g: { kcal: 155, proteinG: 13, carbG: 1, fatG: 11 },
      isWholeFood: true,
    });
    const rice = await upsertFood({
      name: "Рис",
      source: "usda",
      per100g: { kcal: 130, proteinG: 2.7, carbG: 28, fatG: 0.3 },
      isWholeFood: true,
    });
    await addLogEntry({ food: eggs, grams: 100, meal: "breakfast" });
    await addLogEntry({ food: rice, grams: 150, meal: "lunch" });

    const totals = sumEntries(await getEntriesForDate(dayKey()));
    expect(totals.kcal).toBe(155 + Math.round(130 * 1.5)); // 155 + 195 = 350
  });

  it("persists the user profile", async () => {
    await saveProfile(profile);
    const loaded = await getProfile();
    expect(loaded?.weightKg).toBe(100);
    expect(loaded?.goal).toBe("lose");
  });

  it("surfaces recently logged foods for one-tap re-log", async () => {
    const food = await upsertFood({
      name: "Творог",
      source: "usda",
      per100g: { kcal: 98, proteinG: 18, carbG: 3, fatG: 2 },
      isWholeFood: true,
    });
    await addLogEntry({ food, grams: 200, meal: "snack" });
    const recent = await getRecentFoods();
    expect(recent.some((f) => f.name === "Творог")).toBe(true);
  });
});
