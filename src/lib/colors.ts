import type { EmotionType, SpeakerType } from "./types";

// Hue = Emotion type
export const EMOTION_COLORS: Record<EmotionType, string> = {
  Frustration: "#ef4444",
  Confusion: "#f59e0b",
  Satisfaction: "#22c55e",
  Engagement: "#3b82f6",
  Negativity: "#a855f7",
  Neutral: "#6b7280",
};

// Developer: Full saturation, darker shade
export const EMOTION_COLORS_DEV: Record<EmotionType, string> = {
  Frustration: "#dc2626",
  Confusion: "#d97706",
  Satisfaction: "#16a34a",
  Engagement: "#2563eb",
  Negativity: "#9333ea",
  Neutral: "#4b5563",
};

// GPT: Lighter, more muted shade
export const EMOTION_COLORS_GPT: Record<EmotionType, string> = {
  Frustration: "#fca5a5",
  Confusion: "#fcd34d",
  Satisfaction: "#86efac",
  Engagement: "#93c5fd",
  Negativity: "#d8b4fe",
  Neutral: "#9ca3af",
};

export function getEmotionColor(emotion: EmotionType | null | undefined, speaker?: SpeakerType): string {
  if (!emotion) return "#6b7280";
  if (speaker === "Developer") return EMOTION_COLORS_DEV[emotion] ?? EMOTION_COLORS[emotion];
  if (speaker === "GPT") return EMOTION_COLORS_GPT[emotion] ?? EMOTION_COLORS[emotion];
  return EMOTION_COLORS[emotion];
}

export function getEmotionColorBase(emotion: EmotionType | null | undefined): string {
  if (!emotion) return "#6b7280";
  return EMOTION_COLORS[emotion] ?? "#6b7280";
}

// Ordered emotions for display
export const EMOTION_ORDER: EmotionType[] = [
  "Frustration",
  "Confusion",
  "Satisfaction",
  "Engagement",
  "Negativity",
  "Neutral",
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

// Dark theme colors
export const THEME = {
  background: "#0f1117",
  card: "#1a1d27",
  cardBorder: "#2a2d3a",
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  gridLines: "#2a2d3a",
  axes: "#64748b",
  accent: "#22c55e",
};

// Complexity type
type ComplexityType = "Low" | "Medium" | "High";
type IntentType = "question" | "command" | "clarification" | "code_request" | "debugging" | "other";
