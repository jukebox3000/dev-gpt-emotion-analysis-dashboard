'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import { EMOTION_COLORS, getEmotionGlow, EMOTION_ORDER } from '@/lib/colors';
import type { Turn, EmotionType } from '@/lib/types';
import { useDashboardStore } from '@/lib/store';

// ─── Chart P1: Overall Emotion Distribution (Donut) ───────────────────────────
// Shows mapped dev emotion distribution across all turns.
// Placed in: Overview tab
export function ProtoEmotionDonut({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Compute from real data mapped to dev emotions
    const counts: Record<EmotionType, number> = {
      Frustration: 0,
      Confusion: 0,
      Satisfaction: 0,
      Engagement: 0,
      Neutral: 0,
    };
    data.forEach(t => {
      const e = (t.emotion_dev || 'Neutral') as EmotionType;
      counts[e]++;
    });

    const entries = (Object.entries(counts) as [EmotionType, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const total = entries.reduce((s, [, v]) => s + v, 0);

    const margin = { top: 16, right: 140, bottom: 16, left: 16 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const radius = Math.min(innerW, innerH) / 2 - 10;
    const innerR = radius * 0.45;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left + innerW / 2}, ${margin.top + innerH / 2})`);

    const pie = d3.pie<[EmotionType, number]>().value(d => d[1]).sort(null).padAngle(0.018);
    const arc = d3.arc<d3.PieArcDatum<[EmotionType, number]>>().innerRadius(innerR).outerRadius(radius);
    const arcH = d3.arc<d3.PieArcDatum<[EmotionType, number]>>().innerRadius(innerR - 2).outerRadius(radius + 10);

    const slices = g.selectAll('.slice')
      .data(pie(entries))
      .enter().append('path')
      .attr('class', 'proto-donut-slice')
      .attr('d', arc as any)
      .attr('fill', d => EMOTION_COLORS[d.data[0]])
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .style('cursor', 'pointer');

    slices.on('mouseover', (event, d) => {
      const glow = getEmotionGlow(d.data[0]);
      d3.select(event.currentTarget as SVGPathElement)
        .raise()
        .transition().duration(300).ease(d3.easeCubicOut)
        .attr('d', arcH as any)
        .style('filter', `drop-shadow(0 0 8px ${glow})`);
      setGlobalTooltip({
        emotion: d.data[0],
        emotionColor: EMOTION_COLORS[d.data[0]],
        count: d.data[1],
        percentage: `${((d.data[1] / total) * 100).toFixed(1)}%`,
      });
    }).on('mouseout', (event) => {
      d3.select(event.currentTarget as SVGPathElement)
        .transition().duration(300).ease(d3.easeCubicOut)
        .attr('d', arc as any)
        .style('filter', 'none');
      setGlobalTooltip(null);
    }).on('click', (_, d) => {
      useDashboardStore.setState({ selectedEmotions: [d.data[0]], activeTab: 'case-inspector' });
    });

    slices.transition().duration(800).ease(d3.easeCubicInOut).style('opacity', 1);

    // Center text
    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.3em')
      .attr('font-size', '16px').attr('font-weight', 'bold').attr('fill', '#0f172a')
      .text(total.toLocaleString());
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
      .attr('font-size', '10px').attr('fill', '#64748b').text('turns (mapped emotions)');

    // Legend
    const leg = svg.append('g').attr('transform', `translate(${margin.left + innerW + 16}, ${margin.top + 10})`);
    entries.forEach(([emo, cnt], i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 19})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2)
        .attr('fill', EMOTION_COLORS[emo]);
      row.append('text').attr('x', 17).attr('y', 9).attr('font-size', '10px')
        .attr('fill', '#475569').text(`${emo} (${cnt})`);
    });
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart P2: Direct Comparison Dev vs GPT (grouped bar) ─────────────────────
// Placed in: Overview tab
export function ProtoDirectComparison({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Compute per speaker per dev emotion
    const devC: Record<EmotionType, number> = { Frustration: 0, Confusion: 0, Satisfaction: 0, Engagement: 0, Neutral: 0 };
    const gptC: Record<EmotionType, number> = { Frustration: 0, Confusion: 0, Satisfaction: 0, Engagement: 0, Neutral: 0 };
    data.forEach(t => {
      const e = (t.emotion_dev || 'Neutral') as EmotionType;
      if (t.speaker === 'Developer') devC[e]++;
      else gptC[e]++;
    });

    const emotions = EMOTION_ORDER.filter(e => devC[e] + gptC[e] > 0);

    const margin = { top: 20, right: 110, bottom: 60, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(emotions).range([0, innerW]).paddingInner(0.25).paddingOuter(0.15);
    const x1 = d3.scaleBand().domain(['Developer', 'GPT']).range([0, x0.bandwidth()]).padding(0.05);
    const maxY = d3.max(emotions, e => Math.max(devC[e] || 0, gptC[e] || 0)) || 1;
    const y = d3.scaleLinear().domain([0, maxY]).range([innerH, 0]);

    g.append('g').selectAll('line').data(y.ticks(5)).enter().append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#f1f5f9').attr('stroke-width', 0.8);

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px')
      .attr('transform', 'rotate(-25)').attr('text-anchor', 'end').attr('dx', '-4').attr('dy', '4');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

    const speakerData: { emotion: EmotionType; speaker: string; value: number }[] = [];
    emotions.forEach(e => {
      speakerData.push({ emotion: e, speaker: 'Developer', value: devC[e] || 0 });
      speakerData.push({ emotion: e, speaker: 'GPT', value: gptC[e] || 0 });
    });

    const bars = g.selectAll('.cmp-bar')
      .data(speakerData).enter().append('rect')
      .attr('class', 'cmp-bar')
      .attr('x', d => x0(d.emotion)! + x1(d.speaker)!)
      .attr('y', innerH).attr('width', x1.bandwidth()).attr('height', 0)
      .attr('rx', 2)
      .attr('fill', d => d.value === 0 ? 'none' : EMOTION_COLORS[d.emotion])
      .attr('opacity', d => d.value === 0 ? 0.4 : (d.speaker === 'GPT' ? 0.45 : 1))
      .attr('stroke', d => d.value === 0 ? '#cbd5e1' : (d.speaker === 'GPT' ? '#64748b' : 'none'))
      .attr('stroke-dasharray', d => d.value === 0 ? '2,2' : (d.speaker === 'GPT' ? '3,2' : 'none'))
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        g.selectAll('.cmp-bar').transition().duration(300).style('opacity', 0.2);
        d3.select(event.currentTarget as SVGRectElement).raise()
          .transition().duration(300).ease(d3.easeCubicOut)
          .style('opacity', 1)
          .style('filter', `drop-shadow(0 0 6px ${getEmotionGlow(d.emotion)})`);
        setGlobalTooltip({ emotion: d.emotion, emotionColor: EMOTION_COLORS[d.emotion], speaker: d.speaker as any, count: d.value });
      }).on('mouseout', () => {
        g.selectAll('.cmp-bar').transition().duration(300).ease(d3.easeCubicOut)
          .style('opacity', (d: any) => d.value === 0 ? 0.4 : (d.speaker === 'GPT' ? 0.45 : 1)).style('filter', 'none');
        setGlobalTooltip(null);
      }).on('click', (_, d) => {
        const sp = d.speaker === 'Developer' ? ['Developer'] : ['GPT'];
        useDashboardStore.setState({ selectedSpeakers: sp as any, selectedEmotions: [d.emotion], activeTab: 'case-inspector' });
      });

    bars.transition().duration(800).ease(d3.easeCubicInOut)
      .attr('y', d => d.value === 0 ? innerH - 2 : y(d.value))
      .attr('height', d => d.value === 0 ? 2 : innerH - y(d.value));

    // Append zero labels for bars with count 0
    g.selectAll('.zero-label')
      .data(speakerData.filter(d => d.value === 0))
      .enter().append('text')
      .attr('class', 'zero-label')
      .attr('x', d => x0(d.emotion)! + x1(d.speaker)! + x1.bandwidth() / 2)
      .attr('y', innerH - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('fill', '#94a3b8')
      .style('opacity', 0)
      .text('0')
      .transition().delay(400).duration(400)
      .style('opacity', 1);

    // Legend
    const leg = g.append('g').attr('transform', `translate(${innerW + 10}, 5)`);
    ['Developer', 'GPT'].forEach((sp, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2)
        .attr('fill', sp === 'Developer' ? '#3b82f6' : '#10b981')
        .attr('stroke', sp === 'GPT' ? '#64748b' : 'none')
        .attr('stroke-dasharray', sp === 'GPT' ? '3,2' : 'none')
        .attr('stroke-width', sp === 'GPT' ? 1 : 0);
      row.append('text').attr('x', 17).attr('y', 9).attr('font-size', '10px').attr('fill', '#475569').text(sp);
    });

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 55)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Emotion (dev family)');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -30)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Turn Count');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart P3: Code Impact on AI Tone (grouped bar) ───────────────────────────
// Placed in: Deep Analysis tab
export function ProtoCodeImpact({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Compute from real data: GPT turns grouped by has_code
    const gptTurns = data.filter(t => t.speaker === 'GPT');
    const devEmotions = ['Frustration', 'Confusion', 'Satisfaction', 'Engagement', 'Neutral'] as EmotionType[];

    const matrix: Record<string, { withCode: number; noCode: number }> = {};
    devEmotions.forEach(e => { matrix[e] = { withCode: 0, noCode: 0 }; });
    gptTurns.forEach(t => {
      const e = (t.emotion_dev || 'Neutral') as EmotionType;
      if (matrix[e]) {
        if (t.has_code) matrix[e].withCode++; else matrix[e].noCode++;
      }
    });

    const activeEmotions = devEmotions.filter(e => matrix[e].withCode + matrix[e].noCode > 0);

    const margin = { top: 20, right: 120, bottom: 45, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(['No Code', 'With Code']).range([0, innerW]).paddingInner(0.25).paddingOuter(0.2);
    const x1 = d3.scaleBand().domain(activeEmotions).range([0, x0.bandwidth()]).padding(0.08);
    const maxY = d3.max(activeEmotions, e => Math.max(matrix[e].withCode, matrix[e].noCode)) || 1;
    const y = d3.scaleLinear().domain([0, maxY]).range([innerH, 0]);

    g.append('g').selectAll('line').data(y.ticks(5)).enter().append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#f1f5f9').attr('stroke-width', 0.8);

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '11px').attr('dy', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

    ['No Code', 'With Code'].forEach(category => {
      activeEmotions.forEach(emotion => {
        const val = category === 'No Code' ? matrix[emotion].noCode : matrix[emotion].withCode;
        g.append('rect')
          .attr('class', 'impact-bar')
          .attr('x', x0(category)! + x1(emotion)!)
          .attr('y', innerH).attr('width', x1.bandwidth()).attr('height', 0)
          .attr('rx', 2)
          .attr('fill', EMOTION_COLORS[emotion])
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            g.selectAll('.impact-bar').transition().duration(300).style('opacity', 0.25);
            d3.select(event.currentTarget as SVGRectElement).raise()
              .transition().duration(300).ease(d3.easeCubicOut)
              .style('opacity', 1)
              .style('filter', `drop-shadow(0 0 6px ${getEmotionGlow(emotion)})`);
            setGlobalTooltip({
              emotion,
              emotionColor: EMOTION_COLORS[emotion],
              count: val,
              extraFields: { 'Code Block': category },
            });
          }).on('mouseout', () => {
            g.selectAll('.impact-bar').transition().duration(300).ease(d3.easeCubicOut)
              .style('opacity', 1).style('filter', 'none');
            setGlobalTooltip(null);
          }).on('click', () => {
            useDashboardStore.setState({ selectedEmotions: [emotion], activeTab: 'case-inspector' });
          })
          .transition().duration(800).ease(d3.easeCubicInOut)
          .attr('y', y(val)).attr('height', innerH - y(val));
      });
    });

    // Legend
    const leg = g.append('g').attr('transform', `translate(${innerW + 12}, 5)`);
    activeEmotions.forEach((e, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', EMOTION_COLORS[e]);
      row.append('text').attr('x', 17).attr('y', 9).attr('font-size', '10px').attr('fill', '#475569').text(e);
    });

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Code Presence in Turn');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -28)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('GPT Turn Count');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart P4: Emotion Mapping Heatmap (Dev → GPT) ────────────────────────────
// Placed in: Deep Analysis tab
export function ProtoEmotionHeatmap({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Compute from real data: co-occurring Dev+GPT emotions per conversation turn_index
    const devEmotions = ['Frustration', 'Confusion', 'Satisfaction', 'Engagement', 'Neutral'];
    const gptEmotions = ['Satisfaction', 'Engagement', 'Neutral'];

    const matrix: Record<string, Record<string, number>> = {};
    devEmotions.forEach(de => { matrix[de] = {}; gptEmotions.forEach(ge => { matrix[de][ge] = 0; }); });

    // Group by conversation_id + turn_index to pair dev+gpt turns
    const pairs: Record<string, { dev?: string; gpt?: string }> = {};
    data.forEach(t => {
      const pairIndex = Math.floor(t.turn_index / 2);
      const key = `${t.conversation_id}__${pairIndex}`;
      if (!pairs[key]) pairs[key] = {};
      if (t.speaker === 'Developer') pairs[key].dev = t.emotion_dev || 'Neutral';
      else pairs[key].gpt = t.emotion_dev || 'Neutral';
    });

    Object.values(pairs).forEach(({ dev, gpt }) => {
      if (dev && gpt && matrix[dev] && matrix[dev][gpt] !== undefined) {
        matrix[dev][gpt]++;
      }
    });

    const margin = { top: 20, right: 80, bottom: 45, left: 100 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(gptEmotions).range([0, innerW]).padding(0.05);
    const y = d3.scaleBand().domain(devEmotions).range([0, innerH]).padding(0.05);

    const allVals = devEmotions.flatMap(de => gptEmotions.map(ge => matrix[de][ge]));
    const maxVal = d3.max(allVals) || 1;

    const cellData = devEmotions.flatMap(de => gptEmotions.map(ge => ({ de, ge, val: matrix[de][ge] })));

    const cells = g.selectAll('.hm-cell').data(cellData).enter()
      .append('rect').attr('class', 'hm-cell')
      .attr('x', d => x(d.ge)!).attr('y', d => y(d.de)!)
      .attr('width', x.bandwidth()).attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', d => {
        if (d.val === 0) return '#f8fafc';
        const baseColor = EMOTION_COLORS[d.de as EmotionType] || '#7e8fa8';
        const scale = d3.interpolateRgb('#f8fafc', baseColor);
        return scale(0.15 + (d.val / maxVal) * 0.85);
      })
      .style('opacity', 0).style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        g.selectAll('.hm-cell').transition().duration(300).style('opacity', 0.3);
        d3.select(event.currentTarget as SVGRectElement)
          .raise().transition().duration(300).ease(d3.easeCubicOut)
          .style('opacity', 1)
          .style('filter', `drop-shadow(0 0 6px ${getEmotionGlow(d.de as EmotionType)})`);
        setGlobalTooltip({
          emotion: d.de,
          emotionColor: EMOTION_COLORS[d.de as EmotionType] || '#7e8fa8',
          count: d.val,
          extraFields: { 'Dev Emotion': d.de, 'GPT Response': d.ge },
        });
      }).on('mouseout', () => {
        g.selectAll('.hm-cell').transition().duration(300).ease(d3.easeCubicOut).style('opacity', 1).style('filter', 'none');
        setGlobalTooltip(null);
      }).on('click', (_, d) => {
        useDashboardStore.setState({ selectedEmotions: [d.de as EmotionType], activeTab: 'case-inspector' });
      });

    cells.transition().duration(800).ease(d3.easeCubicInOut).style('opacity', 1);

    // Cell labels
    g.selectAll('.hm-label').data(cellData).enter().append('text')
      .attr('class', 'hm-label')
      .attr('x', d => x(d.ge)! + x.bandwidth() / 2)
      .attr('y', d => y(d.de)! + y.bandwidth() / 2)
      .attr('dy', '.35em').attr('text-anchor', 'middle')
      .attr('font-size', '11px').attr('font-weight', '600')
      .attr('fill', d => d.val > maxVal * 0.5 ? '#fff' : '#1e293b')
      .text(d => d.val > 0 ? d.val : '');

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px').attr('dy', '10px');

    g.append('g').call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px').attr('dx', '-5px');

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('GPT Response Emotion');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -75)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Developer Emotion');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart P5: Dev Emotion vs Prompt Complexity (grouped bar) ─────────────────
// Placed in: Overview tab
export function ProtoComplexityEmotion({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const complexities = ['Low', 'Medium', 'High'];
    const devEmotions = ['Frustration', 'Confusion', 'Satisfaction', 'Engagement', 'Neutral'] as EmotionType[];

    const matrix: Record<string, Record<string, number>> = {};
    complexities.forEach(c => { matrix[c] = {}; devEmotions.forEach(e => { matrix[c][e] = 0; }); });

    data.filter(t => t.speaker === 'Developer').forEach(t => {
      const e = (t.emotion_dev || 'Neutral') as EmotionType;
      const c = t.prompt_complexity;
      if (matrix[c] && matrix[c][e] !== undefined) matrix[c][e]++;
    });

    const margin = { top: 20, right: 120, bottom: 45, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(complexities).range([0, innerW]).paddingInner(0.28).paddingOuter(0.2);
    const x1 = d3.scaleBand().domain(devEmotions).range([0, x0.bandwidth()]).padding(0.05);
    const maxY = d3.max(complexities, c => d3.max(devEmotions, e => matrix[c][e]) || 0) || 1;
    const y = d3.scaleLinear().domain([0, maxY]).range([innerH, 0]);

    g.append('g').selectAll('line').data(y.ticks(5)).enter().append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#f1f5f9').attr('stroke-width', 0.8);

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '11px').attr('dy', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

    complexities.forEach(complexity => {
      devEmotions.forEach(emotion => {
        const val = matrix[complexity][emotion];
        g.append('rect').attr('class', 'px-bar')
          .attr('x', x0(complexity)! + x1(emotion)!).attr('y', innerH)
          .attr('width', x1.bandwidth()).attr('height', 0).attr('rx', 2)
          .attr('fill', EMOTION_COLORS[emotion])
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            g.selectAll('.px-bar').transition().duration(300).style('opacity', 0.25);
            d3.select(event.currentTarget as SVGRectElement).raise()
              .transition().duration(300).ease(d3.easeCubicOut)
              .style('opacity', 1).style('filter', `drop-shadow(0 0 6px ${getEmotionGlow(emotion)})`);
            setGlobalTooltip({ emotion, emotionColor: EMOTION_COLORS[emotion], count: val, extraFields: { Complexity: complexity } });
          }).on('mouseout', () => {
            g.selectAll('.px-bar').transition().duration(300).ease(d3.easeCubicOut)
              .style('opacity', 1).style('filter', 'none');
            setGlobalTooltip(null);
          }).on('click', () => {
            useDashboardStore.setState({ selectedEmotions: [emotion], selectedComplexities: [complexity as any], activeTab: 'case-inspector' });
          })
          .transition().duration(800).ease(d3.easeCubicInOut).attr('y', y(val)).attr('height', innerH - y(val));
      });
    });

    const leg = g.append('g').attr('transform', `translate(${innerW + 12}, 5)`);
    devEmotions.forEach((e, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', EMOTION_COLORS[e]);
      row.append('text').attr('x', 17).attr('y', 9).attr('font-size', '10px').attr('fill', '#475569').text(e);
    });

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Prompt Complexity');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -28)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Developer Turn Count');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart P6: Prompt Length vs Sentiment Polarity (Scatter) ──────────────────
// Replaces "Long Prompting Confuse AI" — uses real sentiment_polarity from data
// Placed in: Model Quality tab
export function ProtoLongPromptScatter({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Use developer turns: x=word_count, y=sentiment_polarity, color=emotion_dev
    const devTurns = data.filter(t => t.speaker === 'Developer' && t.word_count > 0);
    // Sample to max 300 for performance
    const sampled = devTurns.length > 300
      ? devTurns.filter((_, i) => i % Math.ceil(devTurns.length / 300) === 0)
      : devTurns;

    const margin = { top: 20, right: 110, bottom: 50, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const maxX = d3.max(sampled, t => t.word_count) || 200;
    const x = d3.scaleLinear().domain([0, Math.min(maxX, 500)]).range([0, innerW]);
    const y = d3.scaleLinear().domain([-1, 1]).range([innerH, 0]);

    // Grid
    g.append('g').selectAll('line').data(y.ticks(5)).enter().append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#f1f5f9').attr('stroke-width', 0.8);
    // Zero line
    g.append('line').attr('x1', 0).attr('x2', innerW).attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', '#cbd5e1').attr('stroke-dasharray', '4,3').attr('stroke-width', 1);

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px').attr('dy', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

    const dots = g.selectAll('.proto-dot').data(sampled).enter()
      .append('circle').attr('class', 'proto-dot')
      .attr('cx', d => x(Math.min(d.word_count, 500)))
      .attr('cy', d => y(d.sentiment_polarity))
      .attr('r', 4)
      .attr('fill', d => EMOTION_COLORS[(d.emotion_dev || 'Neutral') as EmotionType] || '#7e8fa8')
      .attr('stroke', '#fff').attr('stroke-width', 0.8)
      .style('opacity', 0).style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget as SVGCircleElement).raise()
          .transition().duration(300).ease(d3.easeCubicOut)
          .attr('r', 8).style('opacity', 1)
          .style('filter', `drop-shadow(0 0 6px ${getEmotionGlow(d.emotion_dev as EmotionType)})`);
        setGlobalTooltip({
          emotion: d.emotion_dev || 'Neutral',
          emotionColor: EMOTION_COLORS[(d.emotion_dev || 'Neutral') as EmotionType],
          speaker: d.speaker as any,
          extraFields: {
            'Prompt Length': `${d.word_count} words`,
            'Sentiment': d.sentiment_polarity.toFixed(3),
            'Snippet': d.text_preview?.slice(0, 120),
          },
        });
      }).on('mouseout', (event) => {
        d3.select(event.currentTarget as SVGCircleElement)
          .transition().duration(300).ease(d3.easeCubicOut)
          .attr('r', 4).style('opacity', 0.7).style('filter', 'none');
        setGlobalTooltip(null);
      }).on('click', (_, d) => {
        useDashboardStore.setState({
          selectedEmotions: [d.emotion_dev as EmotionType],
          selectedConversationId: d.conversation_id,
          activeTab: 'case-inspector',
        });
      });

    dots.transition().duration(800).ease(d3.easeCubicInOut).style('opacity', 0.7);

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 42)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Developer Prompt Length (words)');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -36)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Sentiment Polarity (−1 → +1)');

    // Emotion legend
    const legEmotions = ['Frustration', 'Confusion', 'Satisfaction', 'Engagement', 'Neutral'] as EmotionType[];
    const leg = g.append('g').attr('transform', `translate(${innerW + 12}, 5)`);
    legEmotions.forEach((e, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('circle').attr('cx', 6).attr('cy', 6).attr('r', 5).attr('fill', EMOTION_COLORS[e]).attr('stroke', '#fff').attr('stroke-width', 0.5);
      row.append('text').attr('x', 16).attr('y', 10).attr('font-size', '10px').attr('fill', '#475569').text(e);
    });
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}
