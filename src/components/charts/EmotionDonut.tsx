'use client';
import { useDashboardStore } from '@/lib/store';
import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_ORDER, EMOTION_COLORS, EMOTION_COLORS_DEV, EMOTION_COLORS_GPT, getEmotionGlow } from '@/lib/colors';
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

    const arcDevHover = d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
      .innerRadius(innerRadiusDev - 2)
      .outerRadius(outerRadiusDev + 10);

    const arcGpt = d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
      .innerRadius(innerRadiusGpt)
      .outerRadius(outerRadiusGpt);

    const arcGptHover = d3.arc<d3.PieArcDatum<{ emotion: string; count: number }>>()
      .innerRadius(innerRadiusGpt - 2)
      .outerRadius(outerRadiusGpt + 10);

    // GPT arcs (outer)
    const gptArcs = g.append('g').selectAll('path')
      .data(pie(gptData))
      .enter()
      .append('path')
      .attr('d', arcGpt as any)
      .attr('fill', d => `url(#pattern-gpt-${d.data.emotion.toLowerCase()})`)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .style('filter', 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.65))')
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const glowColor = getEmotionGlow(d.data.emotion as EmotionType);
        d3.select(event.currentTarget)
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr('d', arcGptHover as any)
          .attr('stroke-width', 2)
          .style('filter', `drop-shadow(0 0 7px ${glowColor})`);

        const pct = ((d.data.count / totalGpt) * 100).toFixed(1);
        const exampleTurn = gptTurns.find(t => (t.emotion_dev || 'Neutral') === d.data.emotion);
        setGlobalTooltip({
          emotion: d.data.emotion,
          emotionColor: EMOTION_COLORS_GPT[d.data.emotion as EmotionType],
          speaker: 'GPT',
          count: d.data.count,
          percentage: `${pct}%`,
          textSnippet: exampleTurn?.text?.slice(0, 250),
        });
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr('d', arcGpt as any)
          .attr('stroke-width', 1.5)
          .style('filter', 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.65))');
        setGlobalTooltip(null);
      })
      .on('click', (event, d) => {
        useDashboardStore.setState({
          selectedEmotions: [d.data.emotion as EmotionType],
          activeTab: 'case-inspector'
        });
        const matchingTurn = data.find(t => (t.emotion_dev || 'Neutral') === d.data.emotion && t.speaker === 'GPT');
        if (matchingTurn) {
          useDashboardStore.setState({
            selectedConversationId: matchingTurn.conversation_id,
            highlightTurnId: matchingTurn.turn_id
          });
        }
      });

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
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .style('filter', 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.65))')
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const glowColor = getEmotionGlow(d.data.emotion as EmotionType);
        d3.select(event.currentTarget)
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr('d', arcDevHover as any)
          .attr('stroke-width', 2)
          .style('filter', `drop-shadow(0 0 8px ${glowColor})`);

        const pct = ((d.data.count / totalDev) * 100).toFixed(1);
        const exampleTurn = devTurns.find(t => (t.emotion_dev || 'Neutral') === d.data.emotion);
        setGlobalTooltip({
          emotion: d.data.emotion,
          emotionColor: EMOTION_COLORS_DEV[d.data.emotion as EmotionType],
          speaker: 'Developer',
          count: d.data.count,
          percentage: `${pct}%`,
          textSnippet: exampleTurn?.text?.slice(0, 250),
        });
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr('d', arcDev as any)
          .attr('stroke-width', 1.5)
          .style('filter', 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.65))');
        setGlobalTooltip(null);
      })
      .on('click', (event, d) => {
        useDashboardStore.setState({
          selectedEmotions: [d.data.emotion as EmotionType],
          activeTab: 'case-inspector'
        });
        const matchingTurn = data.find(t => (t.emotion_dev || 'Neutral') === d.data.emotion && t.speaker === 'Developer');
        if (matchingTurn) {
          useDashboardStore.setState({
            selectedConversationId: matchingTurn.conversation_id,
            highlightTurnId: matchingTurn.turn_id
          });
        }
      });

    devArcs.transition()
      .duration(800)
      .delay(200)
      .ease(d3.easeCubicInOut)
      .style('opacity', 1);

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.3em')
      .attr('fill', '#0f172a')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text(totalAll.toLocaleString());

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', '#64748b')
      .attr('font-size', '11px')
      .text('turns');

  }, [data, width, height]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  return <svg ref={svgRef} />;
}
