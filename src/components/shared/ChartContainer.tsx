'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface ChartContainerProps {
  children: (dimensions: { width: number; height: number }) => React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  aspectRatio?: number;
  minHeight?: number;
  maxHeight?: number;
  /** Mark this chart's title yellow — means the heading/subtitle needs to be verified */
  needsReview?: boolean;
  /** Mark this chart red — candidate for removal */
  danger?: boolean;
}

export default function ChartContainer({
  children,
  title,
  subtitle,
  className = '',
  aspectRatio,
  minHeight = 300,
  maxHeight,
  needsReview = false,
  danger = false,
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      let height = aspectRatio ? width / aspectRatio : Math.max(minHeight, width * 0.55);
      if (maxHeight) height = Math.min(height, maxHeight);
      setDimensions({ width, height });
    }
  }, [aspectRatio, minHeight, maxHeight]);

  useEffect(() => {
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [handleResize]);

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_10px_20px_rgba(0,0,0,0.015)] ${
        danger
          ? 'border-red-500 ring-2 ring-red-500/25 shadow-[0_0_18px_rgba(239,68,68,0.18)] bg-red-50/5'
          : needsReview
          ? 'border-yellow-400 ring-2 ring-yellow-400/20 shadow-[0_0_15px_rgba(234,179,8,0.15)] bg-yellow-50/5'
          : 'border-slate-200'
      } ${className}`}
      style={{ minHeight, ...(maxHeight ? { maxHeight } : {}) }}
    >
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className={`text-sm font-semibold tracking-tight flex items-center gap-1.5 ${
              danger ? 'text-red-600' : needsReview ? 'text-yellow-600' : 'text-slate-800'
            }`}>
              {danger && <span title="Candidate for removal" className="text-base leading-none">🔴</span>}
              {!danger && needsReview && <span title="Needs review" className="text-base leading-none">⚠️</span>}
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={`text-xs font-medium italic mt-0.5 ${
              danger ? 'text-red-400' : needsReview ? 'text-yellow-500' : 'text-slate-400'
            }`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full overflow-hidden"
        style={{ height: dimensions.height > 0 ? dimensions.height : undefined }}
      >
        {dimensions.width > 0 && dimensions.height > 0 && children(dimensions)}
      </div>
    </div>
  );
}
