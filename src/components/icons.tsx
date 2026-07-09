import type { SVGProps } from "react";

/**
 * Calora icon set — inline stroke SVGs (2px, rounded), matching the design
 * system. Use `fill` for the solid glyphs (flame). Color via `currentColor`.
 */
export type IconName =
  | "home"
  | "chart"
  | "search"
  | "user"
  | "plus"
  | "minus"
  | "close"
  | "check"
  | "camera"
  | "mic"
  | "text"
  | "barcode"
  | "protein"
  | "wheat"
  | "drop"
  | "flame"
  | "leaf"
  | "sunrise"
  | "sun"
  | "moon"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "gear"
  | "trend-down"
  | "star"
  | "sparkles"
  | "download"
  | "upload"
  | "trash"
  | "scale"
  | "dumbbell"
  | "share"
  | "dots";

const PATHS: Record<IconName, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>',
  chart: '<path d="M4 20V10M9 20V4M14 20v-7M19 20v-11"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  camera:
    '<path d="M4 8h3l1.5-2h7L17 8h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3"/>',
  text: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
  barcode:
    '<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 8v8M11 8v8M14 8v8M16 8v8"/>',
  protein:
    '<path d="M6.5 6.5 17.5 17.5"/><path d="M4 8 6.5 6.5 8 4"/><path d="M20 16l-2.5 1.5L16 20"/><circle cx="12" cy="12" r="1.6"/>',
  wheat:
    '<path d="M12 3v18"/><path d="M12 7c-2-2-4-1.5-4-1.5s0 2.5 2 3.5 2-2 2-2Z"/><path d="M12 12c-2-2-4-1.5-4-1.5s0 2.5 2 3.5 2-2 2-2Z"/><path d="M12 7c2-2 4-1.5 4-1.5s0 2.5-2 3.5-2-2-2-2Z"/><path d="M12 12c2-2 4-1.5 4-1.5s0 2.5-2 3.5-2-2-2-2Z"/>',
  drop: '<path d="M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10Z"/>',
  flame:
    '<path d="M12 2c1 3 3 4 3 7a3 3 0 0 1-6 0c0-1 .5-2 1-2.5C9 8 8 9.5 8 12a4 4 0 1 0 8 0c0-4-3-7-4-10Z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  sunrise:
    '<path d="M12 3v5M5.6 10.6 4 9M18.4 10.6 20 9M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
  "chevron-left": '<path d="M15 18l-6-6 6-6"/>',
  "chevron-right": '<path d="M9 18l6-6-6-6"/>',
  "chevron-down": '<path d="M6 9l6 6 6-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  "trend-down": '<path d="M4 7l5.5 5.5 3-3L20 17"/><path d="M20 12v5h-5"/>',
  star: '<path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9 6.7 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z"/>',
  sparkles:
    '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  trash:
    '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  scale:
    '<path d="M12 3v17"/><path d="M7 20h10"/><path d="M4 8h16"/><path d="M4 8l-2.2 4.5a2.4 2.4 0 0 0 4.4 0L4 8Z"/><path d="M20 8l-2.2 4.5a2.4 2.4 0 0 0 4.4 0L20 8Z"/>',
  dumbbell:
    '<path d="M6.5 8v8M4 9.5v5M17.5 8v8M20 9.5v5M6.5 12h11"/>',
  share:
    '<path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/>',
  dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
};

export function Icon({
  name,
  size = 20,
  filled = false,
  strokeWidth = 2,
  ...props
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
  strokeWidth?: number;
} & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
      {...props}
    />
  );
}
