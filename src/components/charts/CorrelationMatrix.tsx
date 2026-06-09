'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_ORDER, EMOTION_COLORS, getEmotionGlow, INTENT_ORDER, INTENT_LABELS, THEME } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType, IntentType } from '@/lib/types';
import { useDashboardStore } from '@/lib/store';

interface CorrelationMatrixProps {
  data: Turn[];
  width: number;
  height: number;
}

export default function CorrelationMatrix({ data, width, height }: CorrelationMatrixProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Responsive margins
    const margin = { top: 35, right: 30, bottom: 45, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Prepare data counts of Developer emotions per Prompt Intent
    const matrix: Record<string, Record<string, number>> = {};
    INTENT_ORDER.forEach(intent => {
      matrix[intent] = {};
      EMOTION_ORDER.forEach(e => { matrix[intent][e] = 0; });
    });

    data.filter(t => t.speaker === 'Developer').forEach(t => {
      const emotion = t.emotion_dev || 'Neutral';
      if (matrix[t.prompt_intent] && matrix[t.prompt_intent][emotion] !== undefined) {
        matrix[t.prompt_intent][emotion]++;
      }
    });

    // Compute total turns per Intent
    const intentTotals: Record<string, number> = {};
    INTENT_ORDER.forEach(intent => {
      let sum = 0;
      EMOTION_ORDER.forEach(e => { sum += matrix[intent][e]; });
      intentTotals[intent] = sum || 1; // Prevent division by zero
    });

    // Scales
    const y = d3.scaleBand<string>().domain(INTENT_ORDER).range([0, innerHeight]).padding(0.35);
    const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);

    // X Axis (0% to 100%)
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).tickFormat(d => `${d}%`).ticks(5).tickSize(0))
      .call(axisG => axisG.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '11px').attr('dy', '10px');

    // Y Axis (Intents)
    g.append('g')
      .call(d3.axisLeft(y).tickFormat(d => INTENT_LABELS[d as IntentType] || d).tickSize(0))
      .call(axisG => axisG.select('.domain').remove())
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '11px').attr('dx', '-5px');

    // Vertical helper grid lines at 25%, 50%, 75%
    g.append('g').selectAll('line').data([25, 50, 75]).enter()
      .append('line')
      .attr('x1', d => x(d))
      .attr('x2', d => x(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', THEME.gridLines)
      .attr('stroke-width', 0.8)
      .attr('stroke-dasharray', '2,2');

    // Draw Stacked Segments
    INTENT_ORDER.forEach(intent => {
      let currentX = 0;
      const total = intentTotals[intent];

      EMOTION_ORDER.forEach(emotion => {
        const count = matrix[intent][emotion];
        if (count === 0) return; // Skip drawing zero-width segments

        const pct = (count / total) * 100;
        const segmentStart = currentX;
        currentX += pct;

        const rect = g.append('rect')
          .attr('class', 'corr-bar-segment')
          .attr('x', x(segmentStart))
          .attr('y', y(intent)!)
          .attr('width', 0)
          .attr('height', y.bandwidth())
          .attr('rx', 1.5)
          .attr('fill', EMOTION_COLORS[emotion])
          .style('cursor', 'pointer');

        // Tooltip and interactions
        rect.on('mouseover', (event) => {
          g.selectAll('.corr-bar-segment').transition().duration(150).style('opacity', 0.3);
          d3.select(event.currentTarget)
            .transition().duration(150)
            .style('opacity', 1)
            .style('filter', `drop-shadow(0 0 6px ${getEmotionGlow(emotion)})`);

          setGlobalTooltip({
            emotion,
            emotionColor: EMOTION_COLORS[emotion],
            count,
            percentage: `${pct.toFixed(1)}%`,
            extraFields: {
              Intent: INTENT_LABELS[intent as IntentType] || intent,
              'Total Turns': `${total} Developer turns`
            }
          });
        })
        .on('mouseout', () => {
          g.selectAll('.corr-bar-segment').transition().duration(150).style('opacity', 1).style('filter', 'none');
          setGlobalTooltip(null);
        })
        .on('click', () => {
          useDashboardStore.setState({
            selectedEmotions: [emotion],
            selectedIntents: [intent as IntentType],
            activeTab: 'case-inspector'
          });
        });

        // Animation
        rect.transition().duration(800).ease(d3.easeCubicInOut)
          .attr('width', x(pct));

        // Percentage text overlay (if segment is wide enough)
        if (pct > 8) {
          g.append('text')
            .attr('x', x(segmentStart + pct / 2))
            .attr('y', y(intent)! + y.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#ffffff')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .text(`${pct.toFixed(0)}%`)
            .transition().delay(300).duration(500)
            .style('opacity', 1);
        }
      });
    });

    // Legend
    const legend = g.append('g').attr('transform', `translate(0, -20)`);
    EMOTION_ORDER.forEach((e, i) => {
      const row = legend.append('g').attr('transform', `translate(${i * 90}, 0)`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', EMOTION_COLORS[e]);
      row.append('text').attr('x', 17).attr('y', 9).attr('fill', THEME.textSecondary).attr('font-size', '10px').text(e);
    });

  }, [data, width, height]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return <svg ref={svgRef} className="w-full h-full" />;
}
