'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface ChartContainerProps {
  children: (dimensions: { width: number; height: number }) => React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  aspectRatio?: number;
  minHeight?: number;
}

export default function ChartContainer({
  children,
  title,
  subtitle,
  className = '',
  aspectRatio,
  minHeight = 300,
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      const height = aspectRatio ? width / aspectRatio : Math.max(minHeight, width * 0.55);
      setDimensions({ width, height });
    }
  }, [aspectRatio, minHeight]);

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
      className={`rounded-xl border border-[#2a2d3a] bg-[#1a1d27] p-4 ${className}`}
      style={{ minHeight }}
    >
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h3 className="text-sm font-semibold text-[#e2e8f0]">{title}</h3>}
          {subtitle && <p className="text-xs text-[#94a3b8] mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div ref={containerRef} className="w-full">
        {dimensions.width > 0 && dimensions.height > 0 && children(dimensions)}
      </div>
    </div>
  );
}
