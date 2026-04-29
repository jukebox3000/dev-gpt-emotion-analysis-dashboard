'use client';

import { useEffect, useState, useRef } from 'react';

interface KPICardsProps {
  totalConversations: number;
  frustrationRate: number;
  avgPromptLength: number;
  codePresenceRate: number;
  totalTurns: number;
}

function AnimatedNumber({ value, duration = 1500, formatter }: { value: number; duration?: number; formatter?: (v: number) => string }) {
  const [display, setDisplay] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const animate = (time: number) => {
      if (!startTime.current) startTime.current = time;
      const elapsed = time - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [value, duration]);

  const format = formatter || ((v: number) => Math.round(v).toLocaleString());
  return <span>{format(display)}</span>;
}

export default function KPICards({ totalConversations, frustrationRate, avgPromptLength, codePresenceRate, totalTurns }: KPICardsProps) {
  const cards = [
    {
      title: 'Total Conversations',
      value: totalConversations,
      subtitle: `across ${totalConversations} ChatGPT threads`,
      formatter: (v: number) => Math.round(v).toLocaleString(),
    },
    {
      title: 'Developer Frustration Rate',
      value: frustrationRate,
      subtitle: '% of dev turns with Frustration/Negativity',
      formatter: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      title: 'Avg Dev Prompt Length',
      value: avgPromptLength,
      subtitle: 'words per developer turn',
      formatter: (v: number) => v.toFixed(1),
    },
    {
      title: 'Code Presence Rate',
      value: codePresenceRate,
      subtitle: '% of turns containing code blocks',
      formatter: (v: number) => `${v.toFixed(1)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-xl border border-[#2a2d3a] bg-[#1a1d27] p-4 hover:border-[#3a3d4a] transition-colors"
        >
          <div className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider mb-1">
            {card.title}
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]">
            <AnimatedNumber value={card.value} formatter={card.formatter} />
          </div>
          <div className="text-xs text-[#64748b] mt-1">{card.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
