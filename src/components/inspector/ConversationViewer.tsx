'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Turn, ConversationGroup } from '@/lib/types';
import { EMOTION_COLORS, EMOTION_COLORS_DEV, EMOTION_COLORS_GPT } from '@/lib/colors';
import { useDashboardStore } from '@/lib/store';

interface ConversationViewerProps {
  group: ConversationGroup | null;
  highlightTurnId?: string | null;
}

// Custom ChatGPT Official Logo
function ChatGPTLogo() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-white shrink-0 select-none shadow-sm">
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M21.74 11.23a4.12 4.12 0 0 0-.17-1.63 3.99 3.99 0 0 0-1.74-2.14 4.09 4.09 0 0 0-3.33-.24 4.09 4.09 0 0 0-2.14-1.74 4.09 4.09 0 0 0-3.33.17 4.09 4.09 0 0 0-2.14 1.74 4.09 4.09 0 0 0-1.63.17 3.99 3.99 0 0 0 2.14-1.74 4.09 4.09 0 0 0-.24 3.33 4.09 4.09 0 0 0 1.74 2.14 4.09 4.09 0 0 0 3.33.24 4.09 4.09 0 0 0 2.14 1.74 4.09 4.09 0 0 0 3.33-.17 4.09 4.09 0 0 0 2.14-1.74 4.09 4.09 0 0 0 1.63-.17 3.99 3.99 0 0 0 2.14-1.74 4.09 4.09 0 0 0 .24-3.33zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" />
      </svg>
    </div>
  );
}

// Developer profile avatar
function DevAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-lg shrink-0 select-none shadow-sm">
      👨
    </div>
  );
}

export default function ConversationViewer({ group, highlightTurnId }: ConversationViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [panelWidth, setPanelWidth] = useState(450);
  const [panelHeight, setPanelHeight] = useState(360);

  // shared drag util
  const startDrag = useCallback((
    e: React.MouseEvent,
    cursor: string,
    onMove: (dx: number, dy: number) => void,
  ) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';
    const move = (ev: MouseEvent) => onMove(ev.clientX - startX, ev.clientY - startY);
    const up = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, []);

  // Left edge — width only (drag left = wider)
  const onDragLeft = useCallback((e: React.MouseEvent) => {
    const w0 = panelWidth;
    startDrag(e, 'col-resize', (dx) => {
      setPanelWidth(Math.min(900, Math.max(280, w0 - dx)));
    });
  }, [panelWidth, startDrag]);

  // Top edge — height only (drag up = taller, panel is bottom-anchored)
  const onDragTop = useCallback((e: React.MouseEvent) => {
    const h0 = panelHeight;
    startDrag(e, 'row-resize', (_, dy) => {
      setPanelHeight(Math.min(window.innerHeight * 0.9, Math.max(180, h0 - dy)));
    });
  }, [panelHeight, startDrag]);

  // Bottom-left corner — both axes
  const onDragCorner = useCallback((e: React.MouseEvent) => {
    const w0 = panelWidth; const h0 = panelHeight;
    startDrag(e, 'nesw-resize', (dx, dy) => {
      setPanelWidth(Math.min(900, Math.max(280, w0 - dx)));
      setPanelHeight(Math.min(window.innerHeight * 0.9, Math.max(180, h0 - dy)));
    });
  }, [panelWidth, panelHeight, startDrag]);

  useEffect(() => {
    if (highlightTurnId && containerRef.current && !isMinimized) {
      const targetElement = containerRef.current.querySelector(`[data-turn-id="${highlightTurnId}"]`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [highlightTurnId, group, isMinimized]);

  if (!group) return null;

  const turns = group.turns.sort((a, b) => a.turn_index - b.turn_index);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex flex-col rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.15)]`}
      style={{ width: panelWidth, height: isMinimized ? 52 : panelHeight }}
    >
      {/* Left edge — col-resize */}
      <div
        onMouseDown={onDragLeft}
        className="absolute left-0 top-0 bottom-0 w-1.5 z-10 group cursor-col-resize"
        title="Drag to resize width"
      >
        <div className="h-full w-0.5 ml-0.5 bg-slate-200 group-hover:bg-indigo-400 transition-colors duration-150" />
      </div>

      {/* Top edge — row-resize */}
      {!isMinimized && (
        <div
          onMouseDown={onDragTop}
          className="absolute top-0 left-0 right-0 h-1.5 z-10 group cursor-row-resize"
          title="Drag to resize height"
        >
          <div className="w-full h-0.5 mt-0.5 bg-slate-200 group-hover:bg-indigo-400 transition-colors duration-150" />
        </div>
      )}

      {/* Bottom-left corner grip */}
      {!isMinimized && (
        <div
          onMouseDown={onDragCorner}
          className="absolute bottom-0 left-0 w-4 h-4 z-10 cursor-nesw-resize flex items-end justify-start p-0.5"
          title="Drag corner to resize"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-30 hover:opacity-70 transition-opacity">
            <line x1="0" y1="8" x2="8" y2="0" stroke="#64748b" strokeWidth="1.5"/>
            <line x1="0" y1="5" x2="5" y2="0" stroke="#64748b" strokeWidth="1"/>
          </svg>
        </div>
      )}
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-3 flex items-center justify-between">
        <div className="min-w-0 pr-4 cursor-pointer flex-1" onClick={() => setIsMinimized(!isMinimized)}>
          <h3 className="text-xs font-bold text-slate-800 tracking-tight truncate">{group.sharing_title}</h3>
          <div className="flex gap-2 mt-0.5 text-[10px] text-slate-400 font-semibold truncate">
            <span>by {group.source_author}</span>
            <span>· {group.num_turns} turns</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-200/50 cursor-pointer"
            title={isMinimized ? "Expand chat" : "Minimize chat"}
          >
            {isMinimized ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
              </svg>
            )}
          </button>
          <button
            onClick={() => useDashboardStore.setState({ selectedConversationId: null })}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-200/50 cursor-pointer"
            title="Close chat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Conversation turns */}
      {!isMinimized && (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/30">
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
                data-turn-id={turn.turn_id}
                className={`flex w-full gap-3 items-start transition-all duration-300 ${
                  isDev ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Avatar on Left (for GPT) */}
                {!isDev && <ChatGPTLogo />}

                {/* Message Bubble */}
                <div
                  className={`relative px-4 py-3 rounded-2xl border transition-all duration-300 max-w-[80%] shadow-sm ${
                    isDev ? 'rounded-tr-none' : 'rounded-tl-none'
                  } ${
                    isHighlighted ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: `${emotionColor}${isDev ? '14' : '0c'}`,
                    borderColor: `${emotionColor}40`,
                    ...(isHighlighted ? { '--tw-ring-color': emotionColor } as React.CSSProperties : {}),
                  }}
                >
                  {/* Meta details inside the bubble */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5 border-b border-slate-100 pb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {turn.speaker}
                    </span>
                    <span
                      className="text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{ backgroundColor: `${emotionColor}18`, color: emotionColor }}
                    >
                      {emotion}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {(turn.emotion_confidence * 100).toFixed(0)}% conf.
                    </span>
                    {turn.is_question && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200/20">?</span>
                    )}
                    {turn.has_code && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/20">&lt;/&gt;</span>
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                    {turn.text}
                  </div>

                  {/* Keywords list */}
                  {turn.top_keywords && turn.top_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-slate-100/50">
                      {turn.top_keywords.slice(0, 6).map((kw, i) => (
                        <span
                          key={i}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase tracking-wide"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Avatar on Right (for Dev) */}
                {isDev && <DevAvatar />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
