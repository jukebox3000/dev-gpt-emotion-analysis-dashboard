'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_ORDER, EMOTION_COLORS, INTENT_ORDER, INTENT_LABELS, THEME } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType, IntentType } from '@/lib/types';

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

    const margin = { top: 20, right: 30, bottom: 70, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

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

    const activeEmotions = EMOTION_ORDER.filter(e =>
      INTENT_ORDER.some(i => matrix[i][e] > 0)
    );

    const x = d3.scaleBand<EmotionType>().domain(activeEmotions as EmotionType[]).range([0, innerWidth]).padding(0.05);
    const y = d3.scaleBand<string>().domain(INTENT_ORDER).range([0, innerHeight]).padding(0.05);

    const maxVal = d3.max(INTENT_ORDER, i =>
      d3.max(activeEmotions, e => matrix[i][e]) || 0
    ) || 1;

    const color = d3.scaleSequential()
      .interpolator(t => d3.interpolateRgb('#1a1d27', '#3b82f6')(t))
      .domain([0, maxVal]);

    // X axis (Emotions)
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text')
      .attr('fill', THEME.textSecondary)
      .attr('font-size', '9px')
      .attr('transform', 'rotate(-30)')
      .style('text-anchor', 'end');

    // Y axis (Intents)
    g.append('g')
      .call(d3.axisLeft(y).tickFormat(d => INTENT_LABELS[d as IntentType] || d).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    // Cells
    INTENT_ORDER.forEach(intent => {
      activeEmotions.forEach(emotion => {
        const val = matrix[intent][emotion];
        const exampleTurn = data.find(t =>
          t.speaker === 'Developer' && t.prompt_intent === intent && (t.emotion_dev || 'Neutral') === emotion
        );

        g.append('rect')
          .attr('x', x(emotion as EmotionType)!)
          .attr('y', y(intent)!)
          .attr('width', x.bandwidth())
          .attr('height', y.bandwidth())
          .attr('rx', 3)
          .attr('fill', '#1a1d27')
          .on('mouseover', () => {
            setGlobalTooltip({
              emotion,
              emotionColor: EMOTION_COLORS[emotion as EmotionType],
              count: val,
              extraFields: { Intent: INTENT_LABELS[intent as IntentType] || intent },
              textSnippet: exampleTurn?.text_preview?.slice(0, 100),
            });
          })
          .on('mouseout', () => setGlobalTooltip(null))
          .transition()
          .duration(800)
          .delay((INTENT_ORDER.indexOf(intent) * EMOTION_ORDER.length + EMOTION_ORDER.indexOf(emotion)) * 20)
          .ease(d3.easeCubicInOut)
          .attr('fill', color(val));

        if (val > 0) {
          g.append('text')
            .attr('x', x(emotion as EmotionType)! + x.bandwidth() / 2)
            .attr('y', y(intent)! + y.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', val > maxVal * 0.6 ? '#fff' : THEME.textSecondary)
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .style('opacity', 0)
            .text(val)
            .transition()
            .duration(1000)
            .style('opacity', 1);
        }
      });
    });

    // Axis labels
    g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight + 60)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('Developer Emotion');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -70)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('Prompt Intent');

  }, [data, width, height]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return <svg ref={svgRef} />;
}
