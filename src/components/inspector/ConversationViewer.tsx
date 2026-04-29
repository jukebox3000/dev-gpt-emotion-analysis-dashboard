'use client';

import type { Turn, ConversationGroup } from '@/lib/types';
import { EMOTION_COLORS, EMOTION_COLORS_DEV, EMOTION_COLORS_GPT } from '@/lib/colors';

interface ConversationViewerProps {
  group: ConversationGroup | null;
  highlightTurnId?: string | null;
}

export default function ConversationViewer({ group, highlightTurnId }: ConversationViewerProps) {
  if (!group) {
    return (
      <div className="rounded-xl border border-[#2a2d3a] bg-[#1a1d27] p-6 text-center">
        <p className="text-[#94a3b8] text-sm">
          Click a data point in the scatter plot or select a conversation from the table to view it here.
        </p>
      </div>
    );
  }

  const turns = group.turns.sort((a, b) => a.turn_index - b.turn_index);

  return (
    <div className="rounded-xl border border-[#2a2d3a] bg-[#1a1d27] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#2a2d3a] p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0]">{group.sharing_title}</h3>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-[#94a3b8]">
          <span>by {group.source_author}</span>
          <span>· {group.repo_name}</span>
          <span>· {group.repo_language}</span>
          <span>· {group.num_turns} turns</span>
        </div>
      </div>

      {/* Conversation turns */}
      <div className="max-h-[500px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {turns.map((turn) => {
          const isHighlighted = highlightTurnId === turn.turn_id;
          const emotion = turn.emotion_dev || 'Neutral';
          const isDev = turn.speaker === 'Developer';
          const emotionColor = isDev
            ? EMOTION_COLORS_DEV[emotion as keyof typeof EMOTION_COLORS_DEV] || EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS]
            : EMOTION_COLORS_GPT[emotion as keyof typeof EMOTION_COLORS_GPT] || EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS];

          return (
            <div
              key={turn.turn_id}
              className={`rounded-lg p-3 border transition-all ${
                isHighlighted
                  ? 'border-[#3b82f6] bg-[#1e2a3a]'
                  : 'border-[#2a2d3a] bg-[#15171f]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    isDev
                      ? 'bg-[#22c55e20] text-[#22c55e]'
                      : 'bg-[#3b82f620] text-[#93c5fd]'
                  }`}
                >
                  {turn.speaker}
                </span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${emotionColor}20`, color: emotionColor }}
                >
                  {emotion}
                </span>
                <span className="text-xs text-[#64748b]">
                  {(turn.emotion_confidence * 100).toFixed(0)}% conf.
                </span>
                {turn.is_question && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#f59e0b20] text-[#f59e0b]">?</span>
                )}
                {turn.has_code && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#3b82f620] text-[#93c5fd]">&lt;/&gt;</span>
                )}
              </div>

              <div className="text-sm text-[#cbd5e1] whitespace-pre-wrap break-words leading-relaxed">
                {turn.text.length > 500 ? (
                  <>
                    {turn.text.slice(0, 500)}...
                    <span className="text-[#64748b] text-xs ml-1">({turn.text.length - 500} more chars)</span>
                  </>
                ) : (
                  turn.text
                )}
              </div>

              {turn.top_keywords && turn.top_keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {turn.top_keywords.slice(0, 6).map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2d3a] text-[#94a3b8]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
