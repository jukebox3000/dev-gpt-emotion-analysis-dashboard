'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_COLORS, EMOTION_COLORS_DEV, THEME } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType } from '@/lib/types';
import { useDashboardStore } from '@/lib/store';

interface ScatterPlotProps {
  data: Turn[];
  width: number;
  height: number;
  onPointClick?: (turn: Turn) => void;
}

export default function ScatterPlot({ data, width, height, onPointClick }: ScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    if (data.length === 0) {
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', THEME.textSecondary)
        .text('No data matches current filters');
      return;
    }

    const x = d3.scaleLinear().domain([-1, 1]).range([0, innerWidth]);
    const yMax = d3.max(data, d => d.word_count) || 100;
    const y = d3.scaleLinear().domain([0, yMax * 1.05]).range([innerHeight, 0]);

    // Grid
    g.append('g').selectAll('line').data(x.ticks(5)).enter()
      .append('line').attr('x1', d => x(d)).attr('x2', d => x(d))
      .attr('y1', 0).attr('y2', innerHeight).attr('stroke', THEME.gridLines).attr('stroke-dasharray', '2,2');
    g.append('g').selectAll('line').data(y.ticks(5)).enter()
      .append('line').attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('x1', 0).attr('x2', innerWidth).attr('stroke', THEME.gridLines).attr('stroke-dasharray', '2,2');

    // Zero line for sentiment
    g.append('line')
      .attr('x1', x(0)).attr('x2', x(0))
      .attr('y1', 0).attr('y2', innerHeight)
      .attr('stroke', THEME.axes).attr('stroke-width', 1).attr('stroke-dasharray', '4,4');

    // Axes
    g.append('g').attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('Sentiment Polarity');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -45)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '11px')
      .text('Word Count');

    // Points
    g.selectAll('circle.point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', d => x(d.sentiment_polarity))
      .attr('cy', d => y(d.word_count))
      .attr('r', 0)
      .attr('fill', d => {
        const emotion = d.emotion_dev || 'Neutral';
        return d.speaker === 'Developer'
          ? EMOTION_COLORS_DEV[emotion as EmotionType] || EMOTION_COLORS[emotion as EmotionType]
          : EMOTION_COLORS[emotion as EmotionType] || '#6b7280';
      })
      .attr('opacity', 0.6)
      .attr('stroke', 'none')
      .attr('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 2);
        const emotion = d.emotion_dev || 'Neutral';
        setGlobalTooltip({
          emotion,
          emotionColor: EMOTION_COLORS[emotion as EmotionType],
          speaker: d.speaker,
          count: d.word_count,
          confidence: d.emotion_confidence,
          extraFields: {
            Polarity: d.sentiment_polarity.toFixed(3),
            'Word Count': d.word_count,
          },
          textSnippet: d.text_preview?.slice(0, 100),
          keywords: d.top_keywords?.slice(0, 5),
        });
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.6).attr('stroke', 'none');
        setGlobalTooltip(null);
      })
      .on('click', (event, d) => {
        if (onPointClick) onPointClick(d);
      })
      .transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr('r', 4);

  }, [data, width, height, onPointClick]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return <svg ref={svgRef} />;
}
