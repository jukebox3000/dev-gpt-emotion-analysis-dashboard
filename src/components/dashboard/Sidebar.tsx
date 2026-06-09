'use client';

import Link from 'next/link';
import { useDashboardStore } from '@/lib/store';
import { EMOTION_ORDER, EMOTION_COLORS, INTENT_ORDER, INTENT_LABELS } from '@/lib/colors';
import type { EmotionType, SpeakerType, ComplexityType, IntentType } from '@/lib/types';

const EMOTION_EMOJIS: Record<EmotionType, string> = {
  Frustration: '🤬',
  Confusion: '😕',
  Neutral: '😐',
  Engagement: '💡',
  Satisfaction: '😊',
};

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
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/15 p-4 space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-indigo-100/50 pb-2">
        <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
          <span>🎛️</span> Filters
        </h2>
      </div>

      {/* Emotion Filter Tiles */}
      <div>
        <h3 className="text-xs font-semibold text-indigo-900/50 mb-2.5 uppercase tracking-wider">Emotion</h3>

        <div className="grid grid-cols-2 gap-2">
          {/* Reset All / All tile */}
          <button
            onClick={resetFilters}
            className={`col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl border text-center transition-all cursor-pointer ${selectedEmotions.length === EMOTION_ORDER.length
                ? 'bg-slate-900 border-slate-900 text-white shadow-md font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
          >
            <span className="text-base">🎯</span>
            <span className="text-xs font-bold uppercase tracking-wider">Reset</span>
          </button>

          {/* Emotion Tiles */}
          {EMOTION_ORDER.map((emotion) => {
            const isAllActive = selectedEmotions.length === EMOTION_ORDER.length;
            const isSelected = selectedEmotions.includes(emotion);
            const baseColor = EMOTION_COLORS[emotion];

            let style = {};
            let textClass = '';
            let emojiClass = '';

            if (isAllActive) {
              // State A: Active but not isolated (All selected)
              style = {
                backgroundColor: `${baseColor}24`, // 14% opacity bg
                borderColor: baseColor,
                borderWidth: '1.5px',
                color: baseColor,
              };
              textClass = 'font-bold';
            } else if (isSelected) {
              // State B: Isolated Active (Saturated)
              style = {
                backgroundColor: baseColor,
                borderColor: baseColor,
                borderWidth: '1.5px',
                color: '#ffffff',
              };
              textClass = 'text-white font-extrabold';
            } else {
              // State C: Filtered Out (More visible gray outline and text)
              style = {
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1', // slate-300
                borderWidth: '1px',
                color: '#64748b', // slate-500
              };
              textClass = 'text-slate-500 font-medium';
              emojiClass = 'opacity-45';
            }

            return (
              <button
                key={emotion}
                onClick={() => toggleEmotion(emotion)}
                style={style}
                className="flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <span className={`text-2xl mb-1 filter drop-shadow-sm transition-all ${emojiClass}`}>
                  {EMOTION_EMOJIS[emotion]}
                </span>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider transition-all ${textClass}`}>
                  {emotion}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Speaker Filter */}
      <div>
        <h3 className="text-xs font-semibold text-indigo-900/50 mb-2.5 uppercase tracking-wider">Speaker</h3>
        <div className="grid grid-cols-2 gap-2">
          {allSpeakers.map((speaker) => {
            const isAllActive = selectedSpeakers.length === allSpeakers.length;
            const isSelected = selectedSpeakers.includes(speaker);
            const baseColor = speaker === 'Developer' ? '#3b82f6' : '#10b981';
            const emoji = speaker === 'Developer' ? '👨‍💻' : '🤖';

            let style = {};
            let textClass = '';
            let emojiClass = '';

            if (isAllActive) {
              style = {
                backgroundColor: `${baseColor}24`, // 14% opacity bg
                borderColor: baseColor,
                borderWidth: '1.5px',
                color: baseColor,
              };
              textClass = 'font-bold';
            } else if (isSelected) {
              style = {
                backgroundColor: baseColor,
                borderColor: baseColor,
                borderWidth: '1.5px',
                color: '#ffffff',
              };
              textClass = 'text-white font-extrabold';
            } else {
              style = {
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1', // slate-300
                borderWidth: '1px',
                color: '#64748b', // slate-500
              };
              textClass = 'text-slate-500 font-medium';
              emojiClass = 'opacity-45';
            }

            return (
              <button
                key={speaker}
                onClick={() => toggleSpeaker(speaker)}
                style={style}
                className="flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <span className={`text-2xl mb-1 filter drop-shadow-sm transition-all ${emojiClass}`}>{emoji}</span>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider transition-all ${textClass}`}>
                  {speaker}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Complexity Filter */}
      <div>
        <h3 className="text-xs font-semibold text-indigo-900/50 mb-2 uppercase tracking-wider">Complexity</h3>
        <div className="flex gap-2 items-end min-h-[60px] mt-1.5 border-b border-slate-100 pb-2">
          {allComplexities.map((complexity) => {
            const isAllActive = selectedComplexities.length === allComplexities.length;
            const isSelected = selectedComplexities.includes(complexity);
            const baseColor = '#3b82f6'; // Clean blue shade

            const heightClass =
              complexity === 'Low' ? 'h-8' :
              complexity === 'Medium' ? 'h-11' :
              'h-14';

            let style = {};
            let textClass = '';

            if (isAllActive) {
              style = {
                backgroundColor: `${baseColor}24`, // 14% opacity bg
                borderColor: baseColor,
                borderWidth: '1.5px',
                color: baseColor,
              };
              textClass = 'font-bold';
            } else if (isSelected) {
              style = {
                backgroundColor: baseColor,
                borderColor: baseColor,
                borderWidth: '1.5px',
                color: '#ffffff',
              };
              textClass = 'text-white font-extrabold';
            } else {
              style = {
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1', // slate-300
                borderWidth: '1.5px',
                color: '#64748b', // slate-500
              };
              textClass = 'text-slate-500 font-medium';
            }

            return (
              <button
                key={complexity}
                onClick={() => toggleComplexity(complexity)}
                style={style}
                className={`flex-1 flex flex-col items-center justify-center ${heightClass} rounded-t-md rounded-b-none border transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-sm text-center`}
              >
                <span className={`text-[10px] font-extrabold uppercase tracking-wider leading-none transition-all ${textClass}`}>
                  {complexity === 'Medium' ? 'Med' : complexity}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Intent Filter */}
      <div>
        <h3 className="text-xs font-semibold text-indigo-900/50 mb-2 uppercase tracking-wider">Intent</h3>
        <div className="flex flex-col gap-1">
          {INTENT_ORDER.map((intent) => {
            const isAllActive = selectedIntents.length === INTENT_ORDER.length;
            const isSelected = selectedIntents.includes(intent);
            const baseColor = '#6366f1'; // Unified indigo base

            const INTENT_EMOJIS: Record<IntentType, string> = {
              question: '❓',
              command: '⚙️',
              debugging: '🪲',
              code_request: '📝',
              clarification: '💬',
              other: '🔧',
            };

            let style = {};
            let textClass = '';
            let emojiClass = '';

            if (isAllActive) {
              style = {
                backgroundColor: `${baseColor}15`, // very soft tint background
                borderColor: 'transparent',
                color: baseColor,
              };
              textClass = 'font-bold';
            } else if (isSelected) {
              style = {
                backgroundColor: baseColor,
                borderColor: baseColor,
                color: '#ffffff',
              };
              textClass = 'text-white font-extrabold';
            } else {
              style = {
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                color: '#64748b',
              };
              textClass = 'text-slate-500 font-medium hover:text-slate-800';
              emojiClass = 'opacity-50';
            }

            return (
              <button
                key={intent}
                onClick={() => toggleIntent(intent)}
                style={style}
                className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg border border-transparent transition-all cursor-pointer w-full text-left hover:bg-slate-50"
              >
                <span className={`text-sm transition-all ${emojiClass}`}>
                  {INTENT_EMOJIS[intent]}
                </span>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider transition-all ${textClass}`}>
                  {INTENT_LABELS[intent]}
                </span>
              </button>
            );
          })}

          {/* Reset Intent Button */}
          <button
            onClick={() => useDashboardStore.setState({ selectedIntents: INTENT_ORDER })}
            className={`mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-center transition-all cursor-pointer w-full ${
              selectedIntents.length === INTENT_ORDER.length
                ? 'bg-slate-900 border-slate-900 text-white font-bold shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <span className="text-xs">🎯</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Reset Intent</span>
          </button>
        </div>
      </div>

      <div className="pt-3 border-t border-indigo-100/50 flex flex-col gap-1.5 items-center">
        <Link
          href="/emotxt-dashboard"
          className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors"
        >
          📊 EmoTxt Classifier Dashboard
        </Link>
        <Link
          href="/prototype"
          className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors"
        >
          🔬 Raw Emotions Prototype
        </Link>
        <Link
          href="/senti4sd-prototype"
          className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors"
        >
          🛡️ Senti4SD Sentiment Prototype
        </Link>
      </div>
    </div>
  );
}
