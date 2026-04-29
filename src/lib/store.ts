import { create } from "zustand";
import type { EmotionType, SpeakerType, ComplexityType, IntentType } from "./types";

interface DashboardState {
  // Filters
  selectedEmotions: EmotionType[];
  selectedSpeakers: SpeakerType[];
  selectedComplexities: ComplexityType[];
  selectedIntents: IntentType[];
  searchQuery: string;

  // Tab state
  activeTab: string;

  // Case inspector
  selectedConversationId: string | null;

  // Linked view state
  highlightTurnId: string | null;

  // Data loaded
  dataLoaded: boolean;

  // Actions
  toggleEmotion: (emotion: EmotionType) => void;
  toggleSpeaker: (speaker: SpeakerType) => void;
  toggleComplexity: (complexity: ComplexityType) => void;
  toggleIntent: (intent: IntentType) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  setHighlightTurnId: (id: string | null) => void;
  setDataLoaded: (loaded: boolean) => void;
  resetFilters: () => void;
}

const ALL_EMOTIONS: EmotionType[] = ["Frustration", "Confusion", "Satisfaction", "Engagement", "Negativity", "Neutral"];
const ALL_SPEAKERS: SpeakerType[] = ["Developer", "GPT"];
const ALL_COMPLEXITIES: ComplexityType[] = ["Low", "Medium", "High"];
const ALL_INTENTS: IntentType[] = ["question", "command", "clarification", "code_request", "debugging", "other"];

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedEmotions: ALL_EMOTIONS,
  selectedSpeakers: ALL_SPEAKERS,
  selectedComplexities: ALL_COMPLEXITIES,
  selectedIntents: ALL_INTENTS,
  searchQuery: "",
  activeTab: "overview",
  selectedConversationId: null,
  highlightTurnId: null,
  dataLoaded: false,

  toggleEmotion: (emotion) =>
    set((state) => {
      const isSelected = state.selectedEmotions.includes(emotion);
      const newEmotions = isSelected
        ? state.selectedEmotions.filter((e) => e !== emotion)
        : [...state.selectedEmotions, emotion];
      return { selectedEmotions: newEmotions.length === 0 ? ALL_EMOTIONS : newEmotions };
    }),

  toggleSpeaker: (speaker) =>
    set((state) => {
      const isSelected = state.selectedSpeakers.includes(speaker);
      const newSpeakers = isSelected
        ? state.selectedSpeakers.filter((s) => s !== speaker)
        : [...state.selectedSpeakers, speaker];
      return { selectedSpeakers: newSpeakers.length === 0 ? ALL_SPEAKERS : newSpeakers };
    }),

  toggleComplexity: (complexity) =>
    set((state) => {
      const isSelected = state.selectedComplexities.includes(complexity);
      const newComplexities = isSelected
        ? state.selectedComplexities.filter((c) => c !== complexity)
        : [...state.selectedComplexities, complexity];
      return { selectedComplexities: newComplexities.length === 0 ? ALL_COMPLEXITIES : newComplexities };
    }),

  toggleIntent: (intent) =>
    set((state) => {
      const isSelected = state.selectedIntents.includes(intent);
      const newIntents = isSelected
        ? state.selectedIntents.filter((i) => i !== intent)
        : [...state.selectedIntents, intent];
      return { selectedIntents: newIntents.length === 0 ? ALL_INTENTS : newIntents };
    }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setHighlightTurnId: (id) => set({ highlightTurnId: id }),
  setDataLoaded: (loaded) => set({ dataLoaded: loaded }),

  resetFilters: () =>
    set({
      selectedEmotions: ALL_EMOTIONS,
      selectedSpeakers: ALL_SPEAKERS,
      selectedComplexities: ALL_COMPLEXITIES,
      selectedIntents: ALL_INTENTS,
      searchQuery: "",
    }),
}));
