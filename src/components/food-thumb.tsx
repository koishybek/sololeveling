"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Word-stem → emoji. Order matters: specific dishes and drinks come before
 * the generic ingredients they contain ("кофе с молоком" → ☕, not 🥛).
 */
const STEMS: [string, string][] = [
  // drinks first — they often mention milk/fruit
  ["кофе|кофей|латте|капучино|эспрессо|американо|coffee|latte|cappuccino|espresso", "☕"],
  ["чай|матча|tea|matcha", "🍵"],
  ["кола|пепси|спрайт|фанта|газировк|лимонад|энергетик|soda|cola|lemonade", "🥤"],
  ["сок|смузи|морс|компот|juice|smoothie", "🧃"],
  ["протеин|коктейл|protein shake|shake", "🥤"],
  ["кумыс|шубат|айран|кефир|kefir", "🥛"],
  ["пиво|beer", "🍺"],
  ["вино|wine|шампанск", "🍷"],
  ["водка|виски|коньяк|vodka|whisky|whiskey", "🥃"],
  ["вода|минералк|water", "💧"],
  // dishes
  ["плов|pilaf|plov", "🍛"],
  ["карри|curry", "🍛"],
  ["лагман|рамен|удон|лапш|noodle|ramen|udon", "🍜"],
  ["бешбармак|беш", "🍜"],
  ["манты|пельмен|вареник|хинкал|dumpling|gyoza", "🥟"],
  ["баурсак|пончик|донат|donut|doughnut", "🍩"],
  ["самса|пирож|чебурек|беляш|пирог|pie", "🥧"],
  ["шашлык|кебаб|kebab|skewer", "🍢"],
  ["шаурм|донер|буррито|ролл с|wrap|burrito|shawarma", "🌯"],
  ["тако|taco", "🌮"],
  ["фалафел|falafel", "🧆"],
  ["суши|ролл|sushi|sashimi", "🍣"],
  ["пицц|pizza", "🍕"],
  ["бургер|гамбургер|чизбургер|burger", "🍔"],
  ["хот-дог|хотдог|hot dog|hotdog", "🌭"],
  ["сэндвич|бутерброд|сендвич|sandwich|panini", "🥪"],
  ["картофель фри|фри|fries", "🍟"],
  ["арахисов|ореховая паста|peanut butter", "🥜"],
  ["паста|макарон|спагет|лазань|pasta|spaghetti|lasagn|macaroni", "🍝"],
  ["суп|борщ|щи|солянк|окрошк|сорпа|шорп|бульон|soup|broth", "🍲"],
  ["салат|оливье|винегрет|цезар|salad", "🥗"],
  ["омлет|яичниц|глазунь|omelet", "🍳"],
  ["блин|оладь|сырник|pancake", "🥞"],
  ["вафл|waffle", "🧇"],
  ["каша|овсян|гречк|гречнев|гранол|мюсли|порридж|oat|porridge|granola|muesli|buckwheat|cereal", "🥣"],
  ["попкорн|popcorn", "🍿"],
  ["мороженое|пломбир|ice cream|gelato", "🍦"],
  ["торт|пирожн|чизкейк|тирамису|cake|cheesecake", "🍰"],
  ["кекс|маффин|капкейк|muffin|cupcake", "🧁"],
  ["печень|cookie|biscuit", "🍪"],
  ["батончик|снек|снэк|protein bar|granola bar", "🍫"],
  ["шокол|chocolate|nutella|нутелл", "🍫"],
  ["конфет|мармелад|зефир|халв|candy|gummy|marshmallow", "🍬"],
  ["круассан|croissant", "🥐"],
  ["бублик|бейгл|bagel", "🥯"],
  ["лаваш|лепёшк|лепешк|тортиль|пита|naan|tortilla|pita", "🫓"],
  ["хлеб|тост|батон|булк|багет|bread|toast|bun|baguette", "🍞"],
  // proteins
  ["курин|куриц|грудк|окорочк|крыл|наггетс|chicken|nugget|wing", "🍗"],
  ["индейк|turkey|утк|duck", "🍗"],
  ["бекон|свин|ветчин|bacon|pork|ham", "🥓"],
  ["колбас|сосиск|сардельк|салями|казы|sausage|salami", "🌭"],
  ["говяд|телятин|стейк|баранин|конин|фарш|котлет|мяс|говяж|beef|veal|steak|lamb|mutton|meat|patty", "🥩"],
  ["креветк|shrimp|prawn", "🍤"],
  ["краб|crab", "🦀"],
  ["кальмар|осьминог|squid|octopus", "🦑"],
  ["мидии|устриц|морепрод|oyster|mussel|seafood", "🦪"],
  ["рыб|лосос|сёмг|семг|форел|тунец|тунц|треск|скумбри|сельд|селёдк|минтай|fish|salmon|tuna|cod|trout|mackerel|herring", "🐟"],
  ["яйц|яйко|яич|egg(?!plant)", "🥚"],
  ["тофу|tofu", "🧈"],
  // dairy
  ["творог|творож|сыр|брынз|моцарел|пармезан|фета|cheese|cottage|mozzarella|feta|parmesan", "🧀"],
  ["йогурт|молок|молоч|сливк|сметан|ряженк|кефир|milk|yogurt|yoghurt|cream", "🥛"],
  ["масло сливочн|сливочное|маргарин|butter", "🧈"],
  ["масло|оливков|подсолнечн|oil", "🫒"],
  // grains & legumes
  ["рис|rice|ризотто|risotto", "🍚"],
  ["кукуруз|corn", "🌽"],
  ["фасол|бобы|нут|хумус|чечевиц|горох|соя|bean|lentil|chickpea|hummus|soy", "🫘"],
  ["орех|миндал|арахис|фундук|кешью|фисташ|семечк|nut|almond|peanut|cashew|pistachio|walnut|seed", "🥜"],
  // fruit
  ["банан|banana", "🍌"],
  ["яблок|яблоч|apple", "🍎"],
  ["груш|pear", "🍐"],
  ["апельсин|мандарин|грейпфрут|orange|tangerine|grapefruit|mandarin", "🍊"],
  ["лимон|лайм|lemon|lime", "🍋"],
  ["виноград|изюм|grape|raisin", "🍇"],
  ["клубни|земляник|strawberr", "🍓"],
  ["вишн|черешн|cherr", "🍒"],
  ["персик|абрикос|нектарин|курага|peach|apricot|nectarine", "🍑"],
  ["арбуз|watermelon", "🍉"],
  ["дын|melon", "🍈"],
  ["ананас|pineapple", "🍍"],
  ["манго|mango", "🥭"],
  ["киви|kiwi", "🥝"],
  ["кокос|coconut", "🥥"],
  ["ягод|черник|голубик|малин|смородин|ежевик|berry|blueberr|raspberr|blackberr", "🫐"],
  ["финик|инжир|чернослив|date|fig|prune", "🫐"],
  ["фрукт|fruit", "🍎"],
  // veg
  ["авокадо|avocado", "🥑"],
  ["брокколи|broccoli", "🥦"],
  ["помидор|томат|черри|tomato", "🍅"],
  ["огурц|огурец|cucumber|pickle", "🥒"],
  ["морков|carrot", "🥕"],
  ["картоф|картош|пюре|potato|mash", "🥔"],
  ["батат|sweet potato", "🍠"],
  ["баклажан|eggplant|aubergine", "🍆"],
  ["перец|паприк|pepper", "🫑"],
  ["лук|onion", "🧅"],
  ["чеснок|garlic", "🧄"],
  ["капуст|шпинат|салат|руккол|зелень|кинза|укроп|петрушк|cabbage|spinach|lettuce|kale|greens", "🥬"],
  ["гриб|шампиньон|mushroom", "🍄"],
  ["кабачок|цукини|тыкв|zucchini|pumpkin|squash", "🎃"],
  ["овощ|vegetable|veggie", "🥦"],
  ["мёд|мед|варенье|джем|honey|jam", "🍯"],
  ["соус|кетчуп|майонез|sauce|ketchup|mayo", "🥫"],
  ["соль|сахар|salt|sugar", "🧂"],
];

/** Each stem must start a word, so "сок" doesn't match "высокобелковый". */
const RULES: [RegExp, string][] = STEMS.map(([stems, emoji]) => [
  new RegExp(`(?:^|[^a-zа-яё])(?:${stems})`, "i"),
  emoji,
]);

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
