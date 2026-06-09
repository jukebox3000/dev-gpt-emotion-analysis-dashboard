import type { EmotionType, SpeakerType } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Emotion Color System
// Design rules:
//   • Every emotion has ONE canonical color at uniform mid-brightness (~55% lightness)
//   • Developer variant = that exact canonical color (solid, readable)
//   • GPT variant = same hue but shifted +15° and slightly desaturated (tinted),
//     so both donut rings read as related but distinct — NO more dark/pale extremes
//   • Glow colors are used for hover/click drop-shadow effects
// ─────────────────────────────────────────────────────────────────────────────

// Canonical emotion colors — uniform brightness, clearly distinct hues
export const EMOTION_COLORS: Record<EmotionType, string> = {
  Frustration:  "#f05a5a",   // coral-red      (negative)
  Confusion:    "#e8a020",   // warm amber      (uncertain)
  Satisfaction: "#2db87a",   // medium emerald  (positive)
  Engagement:   "#4a8cf5",   // sky-blue        (positive)
  Neutral:      "#7e8fa8",   // blue-gray       (neutral)
};

// Developer arcs / bars — the canonical color itself (same brightness, no darkening)
export const EMOTION_COLORS_DEV: Record<EmotionType, string> = {
  Frustration:  "#f05a5a",
  Confusion:    "#e8a020",
  Satisfaction: "#2db87a",
  Engagement:   "#4a8cf5",
  Neutral:      "#7e8fa8",
};

// GPT arcs / bars — same hue family, softer fill (lighter tint, same visible brightness family)
// Uses a light fill so the stripe pattern over it renders legibly
export const EMOTION_COLORS_GPT: Record<EmotionType, string> = {
  Frustration:  "#faa0a0",   // light coral-red
  Confusion:    "#f7cf80",   // light warm amber
  Satisfaction: "#85dbb5",   // light emerald
  Engagement:   "#a5c6fa",   // light sky-blue
  Neutral:      "#b8c6d6",   // light blue-gray
};

// Glow colors for hover / click drop-shadow (slightly more saturated)
export const EMOTION_GLOW: Record<EmotionType, string> = {
  Frustration:  "rgba(240, 90,  90,  0.45)",
  Confusion:    "rgba(232, 160, 32,  0.45)",
  Satisfaction: "rgba(45,  184, 122, 0.45)",
  Engagement:   "rgba(74,  140, 245, 0.45)",
  Neutral:      "rgba(126, 143, 168, 0.35)",
};

export function getEmotionColor(emotion: EmotionType | null | undefined, speaker?: SpeakerType): string {
  if (!emotion) return EMOTION_COLORS.Neutral;
  if (speaker === "Developer") return EMOTION_COLORS_DEV[emotion] ?? EMOTION_COLORS[emotion];
  if (speaker === "GPT") return EMOTION_COLORS_GPT[emotion] ?? EMOTION_COLORS[emotion];
  return EMOTION_COLORS[emotion];
}

export function getEmotionColorBase(emotion: EmotionType | null | undefined): string {
  if (!emotion) return EMOTION_COLORS.Neutral;
  return EMOTION_COLORS[emotion] ?? EMOTION_COLORS.Neutral;
}

export function getEmotionGlow(emotion: EmotionType | null | undefined): string {
  if (!emotion) return "rgba(126,143,168,0.35)";
  return EMOTION_GLOW[emotion] ?? "rgba(126,143,168,0.35)";
}

// Ordered emotions for display (neg → neutral → pos)
export const EMOTION_ORDER: EmotionType[] = [
  "Frustration",
  "Confusion",
  "Neutral",
  "Engagement",
  "Satisfaction",
];

export const COMPLEXITY_ORDER: ComplexityType[] = ["Low", "Medium", "High"];

export const INTENT_ORDER: IntentType[] = [
  "question",
  "command",
  "debugging",
  "code_request",
  "clarification",
  "other",
];

export const INTENT_LABELS: Record<IntentType, string> = {
  question: "Question",
  command: "Command",
  debugging: "Debugging",
  code_request: "Code Request",
  clarification: "Clarification",
  other: "Other",
};

// Light theme colors
export const THEME = {
  background: "#f8fafc",
  card: "#ffffff",
  cardBorder: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  gridLines: "#f1f5f9",
  axes: "#94a3b8",
  accent: "#2db87a",
};

// Complexity type
type ComplexityType = "Low" | "Medium" | "High";
type IntentType = "question" | "command" | "clarification" | "code_request" | "debugging" | "other";

