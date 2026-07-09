"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const RULES: [RegExp, string][] = [
  [/грудк|курин|куриц|chicken/i, "🍗"],
  [/индейк|turkey/i, "🍗"],
  [/говяд|стейк|beef|steak|мясо|meat/i, "🥩"],
  [/свин|бекон|pork|bacon/i, "🥓"],
  [/колбас|сосиск|sausage|hot ?dog/i, "🌭"],
  [/рыб|лосос|тунец|форел|fish|salmon|tuna/i, "🐟"],
  [/креветк|shrimp|prawn|морепрод|seafood/i, "🦐"],
  [/яйц|омлет|egg/i, "🥚"],
  [/рис|rice/i, "🍚"],
  [/греч|овсян|каша|порридж|oat|porridge|buckwheat/i, "🥣"],
  [/паст|макарон|спагет|лапш|pasta|spaghetti|noodle/i, "🍝"],
  [/хлеб|тост|булк|bread|toast|bun/i, "🍞"],
  [/блин|оладь|pancake|вафл|waffle/i, "🥞"],
  [/пицц|pizza/i, "🍕"],
  [/бургер|burger/i, "🍔"],
  [/суп|борщ|soup|бульон|broth/i, "🍲"],
  [/салат|salad/i, "🥗"],
  [/брокколи|broccoli/i, "🥦"],
  [/помидор|томат|tomato/i, "🍅"],
  [/морков|carrot/i, "🥕"],
  [/картоф|картош|potato|фри|fries/i, "🥔"],
  [/кукуруз|corn/i, "🌽"],
  [/огурец|огурц|cucumber/i, "🥒"],
  [/авокадо|avocado/i, "🥑"],
  [/банан|banana/i, "🍌"],
  [/яблок|apple/i, "🍎"],
  [/груша|pear/i, "🍐"],
  [/апельсин|мандарин|orange|citrus/i, "🍊"],
  [/виноград|grape/i, "🍇"],
  [/ягод|черник|голубик|clubни|клубник|малин|berry|blueberr|strawberr|raspberr/i, "🫐"],
  [/фрукт|fruit/i, "🍎"],
  [/орех|миндал|арахис|фундук|nut|almond|peanut|walnut/i, "🥜"],
  [/фасол|бобы|нут|чечевиц|горох|bean|lentil|chickpea/i, "🫘"],
  [/сыр|cheese|творог|cottage/i, "🧀"],
  [/молок|кефир|йогурт|milk|yogurt|kefir/i, "🥛"],
  [/масл|butter|oil/i, "🧈"],
  [/мёд|мед|honey|варень|jam/i, "🍯"],
  [/шокол|конфет|сладк|десерт|chocolate|candy|dessert|cake|торт|печень|cookie/i, "🍫"],
  [/кофе|coffee|латте|капучино|эспрессо/i, "☕"],
  [/чай|tea|matcha|матч/i, "🍵"],
  [/сок|juice|смузи|smoothie/i, "🥤"],
  [/вода|water/i, "💧"],
  [/пиво|вино|beer|wine|алкогол|alcohol/i, "🍺"],
  [/грибы|гриб|mushroom/i, "🍄"],
  [/пельмен|вареник|dumpling|манты/i, "🥟"],
  [/суши|роллы|sushi|roll/i, "🍣"],
];

/** Deterministic food emoji from a name (fallback when there's no photo). */
export function foodEmoji(name: string): string {
  for (const [re, emoji] of RULES) if (re.test(name)) return emoji;
  return "🍽️";
}

const TINTS = [
  "var(--color-accent-soft)",
  "var(--color-protein-soft)",
  "var(--color-carb-soft)",
  "var(--color-fat-soft)",
];

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** Food thumbnail: real photo when available, else a tinted emoji chip. */
export function FoodThumb({
  imageUrl,
  name,
  size = 44,
  className,
}: {
  imageUrl?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = imageUrl && !broken;

  if (showImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        style={{ width: size, height: size }}
        className={cn("shrink-0 rounded-xl object-cover", className)}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, background: tintFor(name), fontSize: size * 0.48 }}
      className={cn("grid shrink-0 place-items-center rounded-xl leading-none", className)}
    >
      <span>{foodEmoji(name)}</span>
    </div>
  );
}
