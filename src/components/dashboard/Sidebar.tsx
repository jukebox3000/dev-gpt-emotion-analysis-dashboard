'use client';

import { useDashboardStore } from '@/lib/store';
import { EMOTION_ORDER, EMOTION_COLORS, INTENT_ORDER, INTENT_LABELS } from '@/lib/colors';
import type { EmotionType, SpeakerType, ComplexityType, IntentType } from '@/lib/types';

export default function Sidebar() {
  const {
    selectedEmotions,
    selectedSpeakers,
    selectedComplexities,
    selectedIntents,
    toggleEmotion,
    toggleSpeaker,
    toggleComplexity,
    toggleIntent,
    resetFilters,
  } = useDashboardStore();

  const allSpeakers: SpeakerType[] = ['Developer', 'GPT'];
  const allComplexities: ComplexityType[] = ['Low', 'Medium', 'High'];

  return (
    <div className="rounded-xl border border-[#2a2d3a] bg-[#1a1d27] p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#e2e8f0]">Filters</h2>
        <button
          onClick={resetFilters}
          className="text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Emotion Filter */}
      <div>
        <h3 className="text-xs font-medium text-[#94a3b8] mb-2 uppercase tracking-wider">Emotion</h3>
        <div className="space-y-1">
          {EMOTION_ORDER.map((emotion) => {
            const isActive = selectedEmotions.includes(emotion);
            return (
              <button
                key={emotion}
                onClick={() => toggleEmotion(emotion)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${
                  isActive ? 'bg-[#2a2d3a] text-[#e2e8f0]' : 'text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{
                    backgroundColor: isActive ? EMOTION_COLORS[emotion] : '#2a2d3a',
                    opacity: isActive ? 1 : 0.5,
                  }}
                />
                {emotion}
              </button>
            );
          })}
        </div>
      </div>

      {/* Speaker Filter */}
      <div>
        <h3 className="text-xs font-medium text-[#94a3b8] mb-2 uppercase tracking-wider">Speaker</h3>
        <div className="space-y-1">
          {allSpeakers.map((speaker) => {
            const isActive = selectedSpeakers.includes(speaker);
            return (
              <button
                key={speaker}
                onClick={() => toggleSpeaker(speaker)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${
                  isActive ? 'bg-[#2a2d3a] text-[#e2e8f0]' : 'text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                <span className={`w-3 h-3 rounded-full shrink-0 ${speaker === 'Developer' ? 'bg-[#22c55e]' : 'bg-[#93c5fd]'}`} style={{ opacity: isActive ? 1 : 0.4 }} />
                {speaker}
              </button>
            );
          })}
        </div>
      </div>

      {/* Complexity Filter */}
      <div>
        <h3 className="text-xs font-medium text-[#94a3b8] mb-2 uppercase tracking-wider">Complexity</h3>
        <div className="flex gap-1">
          {allComplexities.map((complexity) => {
            const isActive = selectedComplexities.includes(complexity);
            return (
              <button
                key={complexity}
                onClick={() => toggleComplexity(complexity)}
                className={`flex-1 px-2 py-1.5 rounded text-xs transition-all text-center ${
                  isActive ? 'bg-[#2a2d3a] text-[#e2e8f0]' : 'text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                {complexity}
              </button>
            );
          })}
        </div>
      </div>

      {/* Intent Filter */}
      <div>
        <h3 className="text-xs font-medium text-[#94a3b8] mb-2 uppercase tracking-wider">Intent</h3>
        <div className="space-y-1">
          {INTENT_ORDER.map((intent) => {
            const isActive = selectedIntents.includes(intent);
            return (
              <button
                key={intent}
                onClick={() => toggleIntent(intent)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${
                  isActive ? 'bg-[#2a2d3a] text-[#e2e8f0]' : 'text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                {INTENT_LABELS[intent]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Emotion Color Legend */}
      <div>
        <h3 className="text-xs font-medium text-[#94a3b8] mb-2 uppercase tracking-wider">Color Legend</h3>
        <div className="space-y-1.5 text-[10px]">
          <div className="text-[#94a3b8] font-medium">Speaker Distinction:</div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 rounded-sm bg-[#4b5563]" />
            <span className="text-[#94a3b8]">Developer — saturated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 rounded-sm bg-[#9ca3af]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(75,85,99,0.3) 2px, rgba(75,85,99,0.3) 4px)' }} />
            <span className="text-[#94a3b8]">GPT — muted + stripes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
