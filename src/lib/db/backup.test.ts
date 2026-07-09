import { describe, expect, it } from "vitest";
import { parseBackup } from "./repo";

const validEntry = {
  id: "e1",
  date: "2026-07-01",
  meal: "lunch",
  foodId: "f",
  foodName: "x",
  grams: 100,
  kcal: 200,
  proteinG: 10,
  carbG: 20,
  fatG: 5,
  dbSource: "estimate",
  correctionMade: false,
  isWholeFood: false,
  createdAt: 0,
};

const valid = {
  version: 4,
  exportedAt: 0,
  foods: [],
  logEntries: [validEntry],
  weights: [],
  dailyGoals: [],
  water: [],
  settings: [],
};

describe("parseBackup", () => {
  it("accepts a well-formed backup", () => {
    const b = parseBackup(JSON.stringify(valid));
    expect(b.version).toBe(4);
    expect(b.logEntries).toHaveLength(1);
  });

  it("rejects non-JSON", () => {
    expect(() => parseBackup("not json {{{")).toThrow();
  });

  it("rejects a file with no version", () => {
    expect(() => parseBackup(JSON.stringify({ logEntries: [] }))).toThrow(/версии/);
  });

  it("rejects when logEntries is missing/not an array", () => {
    expect(() => parseBackup(JSON.stringify({ version: 4 }))).toThrow(/записей/);
  });

  it("rejects entries of the wrong shape (foreign file)", () => {
    const bad = { ...valid, logEntries: [{ foo: "bar" }] };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow();
  });

  it("rejects a corrupt section", () => {
    const bad = { ...valid, foods: "oops" };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/foods/);
  });
});
