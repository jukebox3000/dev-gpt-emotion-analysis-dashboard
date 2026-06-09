'use client';
import { useDashboardStore } from '@/lib/store';
import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_ORDER, EMOTION_COLORS_DEV, EMOTION_COLORS_GPT, THEME, getEmotionGlow } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType } from '@/lib/types';

interface EmotionBarChartProps {
  data: Turn[];
  width: number;
  height: number;
}

export default function EmotionBarChart({ data, width, height }: EmotionBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const devTurns = data.filter(t => t.speaker === 'Developer');
    const gptTurns = data.filter(t => t.speaker === 'GPT');

    const devCounts: Record<string, number> = {};
    const gptCounts: Record<string, number> = {};
    EMOTION_ORDER.forEach(e => { devCounts[e] = 0; gptCounts[e] = 0; });

    devTurns.forEach(t => { const e = t.emotion_dev || 'Neutral'; if (devCounts[e] !== undefined) devCounts[e]++; });
    gptTurns.forEach(t => { const e = t.emotion_dev || 'Neutral'; if (gptCounts[e] !== undefined) gptCounts[e]++; });

    const emotions = EMOTION_ORDER.filter(e => devCounts[e] > 0 || gptCounts[e] > 0);

    const y0 = d3.scaleBand<EmotionType>()
      .domain(emotions as EmotionType[])
      .range([0, innerHeight])
      .padding(0.25);

    const y1 = d3.scaleBand<string>()
      .domain(['Developer', 'GPT'])
      .range([0, y0.bandwidth()])
      .padding(0.1);

    const maxCount = d3.max(emotions, e => Math.max(devCounts[e], gptCounts[e])) || 1;

    const x = d3.scaleLinear()
      .domain([0, maxCount])
      .range([0, innerWidth]);

    // Grid lines
    g.append('g')
      .selectAll('line')
      .data(x.ticks(5))
      .enter()
      .append('line')
      .attr('x1', d => x(d))
      .attr('x2', d => x(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', THEME.gridLines)
      .attr('stroke-dasharray', '2,2');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y0).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text')
      .attr('fill', THEME.textSecondary)
      .attr('font-size', '11px');

    // X axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text')
      .attr('fill', THEME.textSecondary)
      .attr('font-size', '10px');

    // Bars
    const totalDev = Object.values(devCounts).reduce((a, b) => a + b, 0) || 1;
    const totalGpt = Object.values(gptCounts).reduce((a, b) => a + b, 0) || 1;

    emotions.forEach(emotion => {
      // Developer bar
      g.append('rect')
        .attr('class', 'bar-rect bar-rect-dev')
        .attr('x', 0)
        .attr('y', y0(emotion as EmotionType)! + y1('Developer')!)
        .attr('width', 0)
        .attr('height', y1.bandwidth())
        .attr('rx', 3)
        .attr('fill', EMOTION_COLORS_DEV[emotion as EmotionType])
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          const glowColor = getEmotionGlow(emotion as EmotionType);
          g.selectAll('.bar-rect')
            .transition().duration(300).style('opacity', 0.25);
          d3.select(event.currentTarget)
            .raise()
            .transition().duration(300).ease(d3.easeCubicOut)
            .style('opacity', 1)
            .style('filter', `drop-shadow(0 0 6px ${glowColor})`)
            .attr('stroke', 'none');

          const pct = ((devCounts[emotion] / totalDev) * 100).toFixed(1);
          const exampleTurn = devTurns.find(t => (t.emotion_dev || 'Neutral') === emotion);
          setGlobalTooltip({
            emotion,
            emotionColor: EMOTION_COLORS_DEV[emotion as EmotionType],
            speaker: 'Developer',
            count: devCounts[emotion],
            percentage: `${pct}%`,
            textSnippet: exampleTurn?.text?.slice(0, 250),
          });
        })
        .on('mouseout', () => {
          g.selectAll('.bar-rect')
            .transition().duration(300).ease(d3.easeCubicOut)
            .style('opacity', 1)
            .style('filter', 'none')
            .attr('stroke', 'none');
          setGlobalTooltip(null);
        })
        .on('click', () => {
          useDashboardStore.setState({
            selectedEmotions: [emotion as EmotionType],
            activeTab: 'case-inspector'
          });
          const matchingTurn = data.find(t => (t.emotion_dev || 'Neutral') === emotion && t.speaker === 'Developer');
          if (matchingTurn) {
            useDashboardStore.setState({
              selectedConversationId: matchingTurn.conversation_id,
              highlightTurnId: matchingTurn.turn_id
            });
          }
        })
        .transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr('width', x(devCounts[emotion]));

      // GPT bar
      g.append('rect')
        .attr('class', 'bar-rect bar-rect-gpt')
        .attr('x', 0)
        .attr('y', y0(emotion as EmotionType)! + y1('GPT')!)
        .attr('width', 0)
        .attr('height', y1.bandwidth())
        .attr('rx', 3)
        .attr('fill', `url(#pattern-gpt-${emotion.toLowerCase()})`)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          const glowColor = getEmotionGlow(emotion as EmotionType);
          g.selectAll('.bar-rect')
            .transition().duration(300).style('opacity', 0.25);
          d3.select(event.currentTarget)
            .raise()
            .transition().duration(300).ease(d3.easeCubicOut)
            .style('opacity', 1)
            .style('filter', `drop-shadow(0 0 6px ${glowColor})`)
            .attr('stroke', 'none');

          const pct = ((gptCounts[emotion] / totalGpt) * 100).toFixed(1);
          const exampleTurn = gptTurns.find(t => (t.emotion_dev || 'Neutral') === emotion);
          setGlobalTooltip({
            emotion,
            emotionColor: EMOTION_COLORS_GPT[emotion as EmotionType],
            speaker: 'GPT',
            count: gptCounts[emotion],
            percentage: `${pct}%`,
            textSnippet: exampleTurn?.text?.slice(0, 250),
          });
        })
        .on('mouseout', () => {
          g.selectAll('.bar-rect')
            .transition().duration(300).ease(d3.easeCubicOut)
            .style('opacity', 1)
            .style('filter', 'none')
            .attr('stroke', 'none');
          setGlobalTooltip(null);
        })
        .on('click', () => {
          useDashboardStore.setState({
            selectedEmotions: [emotion as EmotionType],
            activeTab: 'case-inspector'
          });
          const matchingTurn = data.find(t => (t.emotion_dev || 'Neutral') === emotion && t.speaker === 'GPT');
          if (matchingTurn) {
            useDashboardStore.setState({
              selectedConversationId: matchingTurn.conversation_id,
              highlightTurnId: matchingTurn.turn_id
            });
          }
        })
        .transition()
        .duration(800)
        .delay(100)
        .ease(d3.easeCubicInOut)
        .attr('width', x(gptCounts[emotion]));
    });

    // Legend
    const legend = g.append('g').attr('transform', `translate(${innerWidth - 160}, -10)`);
    legend.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', '#3b82f6');
    legend.append('text').attr('x', 18).attr('y', 10).attr('fill', THEME.textSecondary).attr('font-size', '10px').text('Developer (solid)');
    legend.append('rect').attr('width', 12).attr('height', 12).attr('y', 16).attr('rx', 2).attr('fill', '#10b981');
    legend.append('text').attr('x', 18).attr('y', 26).attr('fill', THEME.textSecondary).attr('font-size', '10px').text('GPT (tinted + pattern)');

  }, [data, width, height]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  return <svg ref={svgRef} />;
}
