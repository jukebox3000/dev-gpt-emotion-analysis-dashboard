export interface Turn {
  turn_id: string;
  conversation_id: string;
  turn_index: number;
  speaker: "Developer" | "GPT";
  text: string;
  text_preview: string;
  emotion_raw: string | null;
  emotion_dev: "Frustration" | "Confusion" | "Satisfaction" | "Engagement" | "Neutral" | null;
  emotion_confidence: number;
  sentiment_polarity: number;
  sentiment_senti4sd?: "positive" | "neutral" | "negative" | null;
  prompt_intent: "question" | "command" | "clarification" | "code_request" | "debugging" | "other";
  prompt_complexity: "Low" | "Medium" | "High";
  word_count: number;
  code_block_count: number;
  code_types: string[];
  has_code: boolean;
  is_question: boolean;
  top_keywords: string[];
  source_type: string;
  source_author: string;
  repo_language: string;
  repo_name: string;
  pr_title: string;
  pr_state: string;
  pr_additions: number;
  pr_deletions: number;
  timestamp: string;
  tokens_prompt: number;
  tokens_answer: number;
  model: string;
  sharing_title: string;
  sharing_url: string;
}

export interface ConversationGroup {
  conversation_id: string;
  num_turns: number;
  num_prompts: number;
  sharing_title: string;
  source_author: string;
  repo_name: string;
  repo_language: string;
  timestamp: string;
  turns: Turn[];
}

export interface SummaryStats {
  overview: {
    total_turns: number;
    total_conversations: number;
    developer_turns: number;
    gpt_turns: number;
    unique_authors: number;
    unique_repos: number;
  };
  emotion_distribution: {
    overall: Record<string, number>;
    developer: Record<string, number>;
    gpt: Record<string, number>;
    raw_labels: Record<string, number>;
  };
  intent_distribution: Record<string, number>;
  complexity_distribution: Record<string, number>;
  language_distribution: Record<string, number>;
  state_distribution: Record<string, number>;
  code_stats: {
    turns_with_code: number;
    percentage_with_code: number;
  };
  question_stats: {
    developer_questions: number;
    question_percentage: number;
  };
  word_count_stats: {
    developer: { mean: number; median: number; min: number; max: number; std: number };
    gpt: { mean: number; median: number; min: number; max: number; std: number };
  };
  sentiment_stats: {
    developer: { mean: number; median: number; positive_pct: number; negative_pct: number };
    gpt: { mean: number; median: number; positive_pct: number; negative_pct: number };
  };
}

export type EmotionType = "Frustration" | "Confusion" | "Satisfaction" | "Engagement" | "Neutral";
export type SpeakerType = "Developer" | "GPT";
export type ComplexityType = "Low" | "Medium" | "High";
export type IntentType = "question" | "command" | "clarification" | "code_request" | "debugging" | "other";

export interface TooltipData {
  emotion?: string;
  emotionColor?: string;
  speaker?: SpeakerType;
  count?: number;
  value?: number;
  percentage?: string;
  textSnippet?: string;
  keywords?: string[];
  confidence?: number;
  extraFields?: Record<string, string | number>;
}

export interface DashboardFilters {
  emotions: EmotionType[];
  speakers: SpeakerType[];
  complexities: ComplexityType[];
  intents: IntentType[];
  searchQuery: string;
  selectedConversationId: string | null;
}
