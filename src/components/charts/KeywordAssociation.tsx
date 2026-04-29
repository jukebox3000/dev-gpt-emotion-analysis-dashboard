'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { EMOTION_ORDER, EMOTION_COLORS, THEME } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType } from '@/lib/types';

interface KeywordAssociationProps {
  data: Turn[];
  width: number;
  height: number;
}

export default function KeywordAssociation({ data, width, height }: KeywordAssociationProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Compute keywords per emotion
    const emotionKeywords: Record<string, Record<string, number>> = {};
    EMOTION_ORDER.forEach(e => { emotionKeywords[e] = {}; });

    data.forEach(t => {
      const emotion = t.emotion_dev || 'Neutral';
      if (emotionKeywords[emotion]) {
        t.top_keywords.forEach(kw => {
          emotionKeywords[emotion][kw] = (emotionKeywords[emotion][kw] || 0) + 1;
        });
      }
    });

    // Get top keywords across all emotions
    const topKeywordsPerEmotion: Record<string, { keyword: string; count: number }[]> = {};
    EMOTION_ORDER.forEach(e => {
      topKeywordsPerEmotion[e] = Object.entries(emotionKeywords[e])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }));
    });

    // Create a combined list for the chart (show top keywords per emotion)
    const chartData: { keyword: string; emotion: string; count: number }[] = [];
    EMOTION_ORDER.forEach(emotion => {
      topKeywordsPerEmotion[emotion].forEach(item => {
        chartData.push({ keyword: item.keyword, emotion, count: item.count });
      });
    });

    // Show top 15 keywords overall
    const globalKeywords: Record<string, number> = {};
    chartData.forEach(d => {
      globalKeywords[d.keyword] = Math.max(globalKeywords[d.keyword] || 0, d.count);
    });
    const top15 = Object.entries(globalKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([kw]) => kw);

    const filteredData = chartData.filter(d => top15.includes(d.keyword));

    // Group by keyword
    const keywordData = top15.map(kw => {
      const emotions: Record<string, number> = {};
      EMOTION_ORDER.forEach(e => { emotions[e] = 0; });
      filteredData.filter(d => d.keyword === kw).forEach(d => {
        emotions[d.emotion] = d.count;
      });
      return { keyword: kw, emotions };
    });

    const y = d3.scaleBand<string>().domain(top15).range([0, innerHeight]).padding(0.15);
    const maxCount = d3.max(keywordData, d => d3.max(EMOTION_ORDER, e => d.emotions[e]) || 0) || 1;
    const x = d3.scaleLinear().domain([0, maxCount]).range([0, innerWidth]);

    // Grid
    g.append('g').selectAll('line').data(x.ticks(5)).enter()
      .append('line').attr('x1', d => x(d)).attr('x2', d => x(d))
      .attr('y1', 0).attr('y2', innerHeight)
      .attr('stroke', THEME.gridLines).attr('stroke-dasharray', '2,2');

    // Axes
    g.append('g').call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '9px');

    g.append('g').attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '10px');

    // Stacked bars per keyword
    keywordData.forEach(d => {
      let currentX = 0;
      EMOTION_ORDER.forEach(emotion => {
        if (d.emotions[emotion] > 0) {
          g.append('rect')
            .attr('x', x(currentX))
            .attr('y', y(d.keyword)!)
            .attr('width', 0)
            .attr('height', y.bandwidth())
            .attr('fill', EMOTION_COLORS[emotion as EmotionType])
            .attr('rx', 1)
            .on('mouseover', () => {
              setGlobalTooltip({
                emotion,
                emotionColor: EMOTION_COLORS[emotion as EmotionType],
                count: d.emotions[emotion],
                extraFields: { Keyword: d.keyword },
              });
            })
            .on('mouseout', () => setGlobalTooltip(null))
            .transition().duration(800).ease(d3.easeCubicInOut)
            .attr('x', x(currentX))
            .attr('width', x(d.emotions[emotion]));

          currentX += d.emotions[emotion];
        }
      });
    });

    // Emotion legend
    const legend = g.append('g').attr('transform', `translate(0, -10)`);
    let lx = 0;
    EMOTION_ORDER.forEach(emotion => {
      legend.append('rect').attr('x', lx).attr('width', 10).attr('height', 10).attr('rx', 2)
        .attr('fill', EMOTION_COLORS[emotion as EmotionType]);
      legend.append('text').attr('x', lx + 14).attr('y', 9).attr('fill', THEME.textSecondary)
        .attr('font-size', '8px').text(emotion);
      lx += emotion.length * 5 + 22;
    });

  }, [data, width, height]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return <svg ref={svgRef} />;
}
