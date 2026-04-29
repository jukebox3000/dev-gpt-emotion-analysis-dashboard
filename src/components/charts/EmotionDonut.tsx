'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_ORDER, EMOTION_COLORS, EMOTION_COLORS_DEV, EMOTION_COLORS_GPT } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType } from '@/lib/types';

interface EmotionDonutProps {
  data: Turn[];
  width: number;
  height: number;
}

export default function EmotionDonut({ data, width, height }: EmotionDonutProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const radius = Math.min(width, height) / 2 - 20;
    const innerRadiusDev = radius * 0.45;
    const outerRadiusDev = radius * 0.7;
    const innerRadiusGpt = radius * 0.72;
    const outerRadiusGpt = radius * 0.95;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Compute data
    const devTurns = data.filter(t => t.speaker === 'Developer');
    const gptTurns = data.filter(t => t.speaker === 'GPT');

    const devCounts: Record<string, number> = {};
    const gptCounts: Record<string, number> = {};
    EMOTION_ORDER.forEach(e => { devCounts[e] = 0; gptCounts[e] = 0; });

    devTurns.forEach(t => {
      const emotion = t.emotion_dev || 'Neutral';
      if (devCounts[emotion] !== undefined) devCounts[emotion]++;
    });
    gptTurns.forEach(t => {
      const emotion = t.emotion_dev || 'Neutral';
      if (gptCounts[emotion] !== undefined) gptCounts[emotion]++;
    });

    const totalDev = Object.values(devCounts).reduce((a, b) => a + b, 0);
    const totalGpt = Object.values(gptCounts).reduce((a, b) => a + b, 0);
    const totalAll = totalDev + totalGpt;

    const devData = EMOTION_ORDER.map(e => ({ emotion: e, count: devCounts[e] })).filter(d => d.count > 0);
    const gptData = EMOTION_ORDER.map(e => ({ emotion: e, count: gptCounts[e] })).filter(d => d.count > 0);

    const pie = d3.pie<{ emotion: string; count: number }>()
      .value(d => d.count)
      .sort(null)
      .padAngle(0.02);

    const arcDev = d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
      .innerRadius(innerRadiusDev)
      .outerRadius(outerRadiusDev);

    const arcGpt = d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
      .innerRadius(innerRadiusGpt)
      .outerRadius(outerRadiusGpt);

    // GPT arcs (outer)
    const gptArcs = g.append('g').selectAll('path')
      .data(pie(gptData))
      .enter()
      .append('path')
      .attr('d', arcGpt as any)
      .attr('fill', d => `url(#pattern-gpt-${d.data.emotion.toLowerCase()})`)
      .attr('stroke', '#1a1d27')
      .attr('stroke-width', 1)
      .style('opacity', 0)
      .on('mouseover', (event, d) => {
        const pct = ((d.data.count / totalGpt) * 100).toFixed(1);
        const exampleTurn = gptTurns.find(t => (t.emotion_dev || 'Neutral') === d.data.emotion);
        setGlobalTooltip({
          emotion: d.data.emotion,
          emotionColor: EMOTION_COLORS_GPT[d.data.emotion as EmotionType],
          speaker: 'GPT',
          count: d.data.count,
          percentage: `${pct}%`,
          textSnippet: exampleTurn?.text_preview?.slice(0, 100),
        });
      })
      .on('mouseout', () => setGlobalTooltip(null));

    gptArcs.transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .style('opacity', 1);

    // Developer arcs (inner)
    const devArcs = g.append('g').selectAll('path')
      .data(pie(devData))
      .enter()
      .append('path')
      .attr('d', arcDev as any)
      .attr('fill', d => EMOTION_COLORS_DEV[d.data.emotion as EmotionType] || EMOTION_COLORS[d.data.emotion as EmotionType])
      .attr('stroke', '#1a1d27')
      .attr('stroke-width', 1)
      .style('opacity', 0)
      .on('mouseover', (event, d) => {
        const pct = ((d.data.count / totalDev) * 100).toFixed(1);
        const exampleTurn = devTurns.find(t => (t.emotion_dev || 'Neutral') === d.data.emotion);
        setGlobalTooltip({
          emotion: d.data.emotion,
          emotionColor: EMOTION_COLORS_DEV[d.data.emotion as EmotionType],
          speaker: 'Developer',
          count: d.data.count,
          percentage: `${pct}%`,
          textSnippet: exampleTurn?.text_preview?.slice(0, 100),
        });
      })
      .on('mouseout', () => setGlobalTooltip(null));

    devArcs.transition()
      .duration(800)
      .delay(200)
      .ease(d3.easeCubicInOut)
      .style('opacity', 1);

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.3em')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text(totalAll.toLocaleString());

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .text('turns');

  }, [data, width, height]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  return <svg ref={svgRef} />;
}
