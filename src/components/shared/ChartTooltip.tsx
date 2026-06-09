'use client';

import { useEffect, useRef, useState } from 'react';
import type { TooltipData } from '@/lib/types';
import { getEmotionColorBase } from '@/lib/colors';

interface ChartTooltipProps {
  data: TooltipData | null;
}

export default function ChartTooltip({ data }: ChartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX + 16, y: e.clientY - 10 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!data) return null;

  return (
    <div
      ref={tooltipRef}
      className="pointer-events-none fixed z-[9999] rounded-lg border border-[#224369] bg-[#0f1f33]/95 px-3 py-2 shadow-xl backdrop-blur-sm"
      style={{ left: pos.x, top: pos.y, maxWidth: 320 }}
    >
      <div className="flex items-center gap-2 mb-1">
        {data.emotion && (
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: data.emotionColor || getEmotionColorBase(data.emotion as any) }}
          />
        )}
        {data.emotion && (
          <span className="text-xs font-semibold text-[#e2e8f0]">{data.emotion}</span>
        )}
        {data.speaker && (
          <span className="text-xs text-[#94a3b8]">· {data.speaker}</span>
        )}
      </div>
      {data.count !== undefined && (
        <div className="text-xs text-[#94a3b8]">
          Count: <span className="text-[#e2e8f0] font-medium">{data.count}</span>
          {data.percentage && <span className="ml-1">({data.percentage})</span>}
        </div>
      )}
      {data.value !== undefined && (
        <div className="text-xs text-[#94a3b8]">
          Value: <span className="text-[#e2e8f0] font-medium">{typeof data.value === 'number' ? data.value.toFixed(2) : data.value}</span>
        </div>
      )}
      {data.confidence !== undefined && (
        <div className="text-xs text-[#94a3b8]">
          Confidence: <span className="text-[#e2e8f0] font-medium">{(data.confidence * 100).toFixed(1)}%</span>
        </div>
      )}
      {data.textSnippet && (
        <div className="text-xs text-[#94a3b8] mt-1.5 line-clamp-5 italic border-t border-[#224369]/30 pt-1.5 leading-relaxed">
          &ldquo;{data.textSnippet}&rdquo;
        </div>
      )}
      {data.keywords && data.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {data.keywords.slice(0, 5).map((kw, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2d3a] text-[#94a3b8]">
              {kw}
            </span>
          ))}
        </div>
      )}
      {data.extraFields && Object.entries(data.extraFields).map(([key, val]) => (
        <div key={key} className="text-xs text-[#94a3b8]">
          {key}: <span className="text-[#e2e8f0] font-medium">{val}</span>
        </div>
      ))}
    </div>
  );
}

// Global tooltip state manager
let globalSetTooltip: ((data: TooltipData | null) => void) | null = null;

export function setGlobalTooltip(data: TooltipData | null) {
  if (globalSetTooltip) globalSetTooltip(data);
}

export function useTooltipState() {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    globalSetTooltip = setTooltip;
    return () => { globalSetTooltip = null; };
  }, []);

  return tooltip;
}
