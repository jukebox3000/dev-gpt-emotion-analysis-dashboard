import type { Turn, ConversationGroup, SummaryStats, EmotionType, SpeakerType, ComplexityType, IntentType } from "./types";
import { EMOTION_ORDER } from "./colors";

let cachedTurns: Turn[] | null = null;
let cachedGroups: ConversationGroup[] | null = null;
let cachedStats: SummaryStats | null = null;

export async function loadTurns(): Promise<Turn[]> {
  if (cachedTurns) return cachedTurns;
  const res = await fetch("/data/processed_conversations.json");
  const data: Turn[] = await res.json();
  cachedTurns = data;
  return data;
}

export async function loadConversationGroups(): Promise<ConversationGroup[]> {
  if (cachedGroups) return cachedGroups;
  const res = await fetch("/data/conversation_groups.json");
  const data: ConversationGroup[] = await res.json();
  cachedGroups = data;
  return data;
}

export async function loadSummaryStats(): Promise<SummaryStats> {
  if (cachedStats) return cachedStats;
  const res = await fetch("/data/summary_stats.json");
  const data: SummaryStats = await res.json();
  cachedStats = data;
  return data;
}

export function filterTurns(
  turns: Turn[],
  options: {
    emotions?: EmotionType[];
    speakers?: SpeakerType[];
    complexities?: ComplexityType[];
    intents?: IntentType[];
    searchQuery?: string;
  }
): Turn[] {
  let filtered = turns;

  if (options.emotions && options.emotions.length < EMOTION_ORDER.length) {
    filtered = filtered.filter((t) => t.emotion_dev && options.emotions!.includes(t.emotion_dev));
  }

  if (options.speakers && options.speakers.length < 2) {
    filtered = filtered.filter((t) => options.speakers!.includes(t.speaker));
  }

  if (options.complexities && options.complexities.length < 3) {
    filtered = filtered.filter((t) => options.complexities!.includes(t.prompt_complexity));
  }

  if (options.intents && options.intents.length < 6) {
    filtered = filtered.filter((t) => options.intents!.includes(t.prompt_intent));
  }

  if (options.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.text.toLowerCase().includes(q) ||
        t.top_keywords.some((k) => k.toLowerCase().includes(q)) ||
        t.sharing_title.toLowerCase().includes(q)
    );
  }

  return filtered;
}

export function getConversationById(groups: ConversationGroup[], id: string): ConversationGroup | undefined {
  return groups.find((g) => g.conversation_id === id);
}

export function computeEmotionDistribution(turns: Turn[]) {
  const devCounts: Record<string, number> = {};
  const gptCounts: Record<string, number> = {};

  turns.forEach((t) => {
    const emotion = t.emotion_dev || "Neutral";
    if (t.speaker === "Developer") {
      devCounts[emotion] = (devCounts[emotion] || 0) + 1;
    } else {
      gptCounts[emotion] = (gptCounts[emotion] || 0) + 1;
    }
  });

  return { devCounts, gptCounts };
}

export function computeComplexityEmotionMatrix(turns: Turn[]) {
  const matrix: Record<string, Record<string, number>> = {};
  const complexities: ComplexityType[] = ["Low", "Medium", "High"];

  complexities.forEach((c) => {
    matrix[c] = {};
    EMOTION_ORDER.forEach((e) => {
      matrix[c][e] = 0;
    });
  });

  turns.forEach((t) => {
    const emotion = t.emotion_dev || "Neutral";
    if (matrix[t.prompt_complexity] && matrix[t.prompt_complexity][emotion] !== undefined) {
      matrix[t.prompt_complexity][emotion] += 1;
    }
  });

  return matrix;
}

export function computeEmotionMapping(turns: Turn[], groups: ConversationGroup[]) {
  const mapping: Record<string, Record<string, number>> = {};
  const devEmotions = ["Frustration", "Confusion", "Satisfaction", "Engagement", "Neutral"];
  const gptEmotions = ["Confusion", "Satisfaction", "Engagement", "Neutral"];

  devEmotions.forEach((de) => {
    mapping[de] = {};
    gptEmotions.forEach((ge) => {
      mapping[de][ge] = 0;
    });
  });

  groups.forEach((group) => {
    const devTurns = group.turns.filter((t) => t.speaker === "Developer" && t.emotion_dev);
    const gptTurns = group.turns.filter((t) => t.speaker === "GPT" && t.emotion_dev);

    devTurns.forEach((dt) => {
      gptTurns.forEach((gt) => {
        const de = dt.emotion_dev!;
        const ge = gt.emotion_dev!;
        if (mapping[de] && mapping[de][ge] !== undefined) {
          mapping[de][ge] += 1;
        }
      });
    });
  });

  return mapping;
}

export function computeCodeImpact(turns: Turn[]) {
  const result: Record<string, { withCode: number; withoutCode: number }> = {};
  const emotions = ["Confusion", "Satisfaction", "Engagement", "Neutral"];

  emotions.forEach((e) => {
    result[e] = { withCode: 0, withoutCode: 0 };
  });

  turns
    .filter((t) => t.speaker === "GPT" && result[t.emotion_dev || "Neutral"])
    .forEach((t) => {
      const emotion = t.emotion_dev || "Neutral";
      if (result[emotion]) {
        if (t.has_code) {
          result[emotion].withCode += 1;
        } else {
          result[emotion].withoutCode += 1;
        }
      }
    });

  return result;
}

export function computeIntentEmotionMatrix(turns: Turn[]) {
  const matrix: Record<string, Record<string, number>> = {};
  const intents: IntentType[] = ["question", "command", "debugging", "code_request", "clarification", "other"];

  intents.forEach((intent) => {
    matrix[intent] = {};
    EMOTION_ORDER.forEach((e) => {
      matrix[intent][e] = 0;
    });
  });

  turns
    .filter((t) => t.speaker === "Developer")
    .forEach((t) => {
      const emotion = t.emotion_dev || "Neutral";
      if (matrix[t.prompt_intent] && matrix[t.prompt_intent][emotion] !== undefined) {
        matrix[t.prompt_intent][emotion] += 1;
      }
    });

  return matrix;
}

export function computeKeywordAssociations(turns: Turn[]): Record<string, { keyword: string; count: number }[]> {
  const result: Record<string, { keyword: string; count: number }[]> = {};
  const emotionKeywords: Record<string, Record<string, number>> = {};

  EMOTION_ORDER.forEach((e) => {
    emotionKeywords[e] = {};
  });

  turns.forEach((t) => {
    const emotion = t.emotion_dev || "Neutral";
    if (emotionKeywords[emotion]) {
      t.top_keywords.forEach((kw) => {
        emotionKeywords[emotion][kw] = (emotionKeywords[emotion][kw] || 0) + 1;
      });
    }
  });

  EMOTION_ORDER.forEach((e) => {
    const sorted = Object.entries(emotionKeywords[e])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
    result[e] = sorted;
  });

  return result;
}

export function computeConfidenceHistogram(turns: Turn[], bins: number = 20): { dev: { bin: number; count: number }[]; gpt: { bin: number; count: number }[] } {
  const binWidth = 1.0 / bins;

  const devBins = Array.from({ length: bins }, (_, i) => ({ bin: i * binWidth, count: 0 }));
  const gptBins = Array.from({ length: bins }, (_, i) => ({ bin: i * binWidth, count: 0 }));

  turns.forEach((t) => {
    const binIdx = Math.min(Math.floor(t.emotion_confidence / binWidth), bins - 1);
    if (t.speaker === "Developer") {
      devBins[binIdx].count += 1;
    } else {
      gptBins[binIdx].count += 1;
    }
  });

  return { dev: devBins, gpt: gptBins };
}

export function computeSentimentHistogram(turns: Turn[], bins: number = 30): { dev: { bin: number; count: number }[]; gpt: { bin: number; count: number }[] } {
  const binWidth = 2.0 / bins;

  const devBins = Array.from({ length: bins }, (_, i) => ({ bin: -1 + i * binWidth, count: 0 }));
  const gptBins = Array.from({ length: bins }, (_, i) => ({ bin: -1 + i * binWidth, count: 0 }));

  turns.forEach((t) => {
    const binIdx = Math.min(Math.max(Math.floor((t.sentiment_polarity + 1) / binWidth), 0), bins - 1);
    if (t.speaker === "Developer") {
      devBins[binIdx].count += 1;
    } else {
      gptBins[binIdx].count += 1;
    }
  });

  return { dev: devBins, gpt: gptBins };
}
