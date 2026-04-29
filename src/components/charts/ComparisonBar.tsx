'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { COMPLEXITY_ORDER, EMOTION_ORDER, EMOTION_COLORS, EMOTION_COLORS_DEV, THEME } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType, ComplexityType } from '@/lib/types';

interface ComplexityEmotionBarProps {
  data: Turn[];
  width: number;
  height: number;
}

export default function ComplexityEmotionBar({ data, width, height }: ComplexityEmotionBarProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Compute matrix
    const matrix: Record<string, Record<string, number>> = {};
    COMPLEXITY_ORDER.forEach(c => {
      matrix[c] = {};
      EMOTION_ORDER.forEach(e => { matrix[c][e] = 0; });
    });

    data.forEach(t => {
      const emotion = t.emotion_dev || 'Neutral';
      if (matrix[t.prompt_complexity] && matrix[t.prompt_complexity][emotion] !== undefined) {
        matrix[t.prompt_complexity][emotion]++;
      }
    });

    const activeEmotions = EMOTION_ORDER.filter(e =>
      COMPLEXITY_ORDER.some(c => matrix[c][e] > 0)
    );

    const x0 = d3.scaleBand<ComplexityType>()
      .domain(COMPLEXITY_ORDER)
      .range([0, innerWidth])
      .padding(0.2);

    const x1 = d3.scaleBand<EmotionType>()
      .domain(activeEmotions as EmotionType[])
      .range([0, x0.bandwidth()])
      .padding(0.05);

    const maxVal = d3.max(COMPLEXITY_ORDER, c =>
      d3.max(activeEmotions, e => matrix[c][e]) || 0
    ) || 1;

    const y = d3.scaleLinear()
      .domain([0, maxVal])
      .range([innerHeight, 0]);

    // Grid
    g.append('g')
      .selectAll('line')
      .data(y.ticks(5))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', THEME.gridLines)
      .attr('stroke-dasharray', '2,2');

    // X axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text')
      .attr('fill', THEME.textSecondary)
      .attr('font-size', '11px');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text')
      .attr('fill', THEME.textSecondary)
      .attr('font-size', '10px');

    // Bars
    COMPLEXITY_ORDER.forEach(complexity => {
      activeEmotions.forEach(emotion => {
        const val = matrix[complexity][emotion];
        g.append('rect')
          .attr('x', x0(complexity)! + x1(emotion as EmotionType)!)
          .attr('y', innerHeight)
          .attr('width', x1.bandwidth())
          .attr('height', 0)
          .attr('rx', 2)
          .attr('fill', EMOTION_COLORS_DEV[emotion as EmotionType] || EMOTION_COLORS[emotion as EmotionType])
          .on('mouseover', () => {
            const exampleTurn = data.find(t =>
              t.prompt_complexity === complexity &&
              (t.emotion_dev || 'Neutral') === emotion
            );
            setGlobalTooltip({
              emotion,
              emotionColor: EMOTION_COLORS[emotion as EmotionType],
              count: val,
              extraFields: {
                Complexity: complexity,
              },
              textSnippet: exampleTurn?.text_preview?.slice(0, 100),
            });
          })
          .on('mouseout', () => setGlobalTooltip(null))
          .transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .attr('y', y(val))
          .attr('height', innerHeight - y(val));
      });
    });

    // Emotion legend
    const legend = g.append('g').attr('transform', `translate(0, -5)`);
    let legendX = 0;
    activeEmotions.forEach(emotion => {
      legend.append('rect')
        .attr('x', legendX)
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', EMOTION_COLORS[emotion as EmotionType]);
      legend.append('text')
        .attr('x', legendX + 14)
        .attr('y', 9)
        .attr('fill', THEME.textSecondary)
        .attr('font-size', '9px')
        .text(emotion);
      legendX += emotion.length * 6 + 24;
    });

  }, [data, width, height]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return <svg ref={svgRef} />;
}
