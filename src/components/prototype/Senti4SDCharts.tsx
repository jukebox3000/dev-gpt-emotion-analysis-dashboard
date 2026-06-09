'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn } from '@/lib/types';

// Curated sentiment color system
export const SENTI_COLORS: Record<string, string> = {
  positive: '#10b981', // emerald-500
  neutral:  '#64748b', // slate-500
  negative: '#ef4444', // red-500
};

function sentiGlow(sentiment: string): string {
  const c = SENTI_COLORS[sentiment.toLowerCase()];
  if (!c) return 'rgba(100,116,139,0.35)';
  const r = parseInt(c.slice(1,3),16);
  const g = parseInt(c.slice(3,5),16);
  const b = parseInt(c.slice(5,7),16);
  return `rgba(${r},${g},${b},0.45)`;
}

// ─── Chart S1: Senti4SD Sentiment Distribution (Donut) ───────────────────────────
export function Senti4SDDonut({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [speakerFilter, setSpeakerFilter] = useState<'developer' | 'gpt' | 'both'>('both');

  useEffect(() => {
    if (!svgRef.current || width === 0 || height === 0) return;
    const svg = d3.select(svgRef.current);

    // Initialize main group and patterns
    let g = svg.select<SVGGElement>('g.main-group');
    if (g.empty()) {
      svg.selectAll('*').remove();
      g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('class', 'main-group')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
    } else {
      g.attr('transform', `translate(${width / 2}, ${height / 2})`);
    }

    // Add patterns inside defs
    let defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.append('defs');
      
      // Positive (green) pattern
      const pPos = defs.append('pattern')
        .attr('id', 'pattern-senti-positive')
        .attr('width', 6)
        .attr('height', 6)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)');
      pPos.append('rect').attr('width', 6).attr('height', 6).attr('fill', '#a7f3d0'); 
      pPos.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('stroke', '#10b981').attr('stroke-width', 2);
      
      // Neutral (slate) pattern
      const pNeu = defs.append('pattern')
        .attr('id', 'pattern-senti-neutral')
        .attr('width', 6)
        .attr('height', 6)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)');
      pNeu.append('rect').attr('width', 6).attr('height', 6).attr('fill', '#cbd5e1'); 
      pNeu.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('stroke', '#64748b').attr('stroke-width', 2);
      
      // Negative (red) pattern
      const pNeg = defs.append('pattern')
        .attr('id', 'pattern-senti-negative')
        .attr('width', 6)
        .attr('height', 6)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)');
      pNeg.append('rect').attr('width', 6).attr('height', 6).attr('fill', '#fecaca'); 
      pNeg.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('stroke', '#ef4444').attr('stroke-width', 2);
    }

    const margin = 20;
    const radius = Math.min(width, height) / 2 - margin;

    // Filter turns
    const devTurns = data.filter(t => t.speaker === 'Developer');
    const gptTurns = data.filter(t => t.speaker === 'GPT');

    const devCounts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    const gptCounts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };

    devTurns.forEach(t => {
      const s = t.sentiment_senti4sd || 'neutral';
      devCounts[s]++;
    });
    gptTurns.forEach(t => {
      const s = t.sentiment_senti4sd || 'neutral';
      gptCounts[s]++;
    });

    const totalDev = Object.values(devCounts).reduce((a, b) => a + b, 0);
    const totalGpt = Object.values(gptCounts).reduce((a, b) => a + b, 0);
    const totalAll = totalDev + totalGpt;

    const devData = Object.entries(devCounts).map(([k, v]) => ({ label: k, count: v })).filter(d => d.count > 0);
    const gptData = Object.entries(gptCounts).map(([k, v]) => ({ label: k, count: v })).filter(d => d.count > 0);

    const pie = d3.pie<{ label: string; count: number }>()
      .value(d => d.count)
      .sort(null)
      .padAngle(0.02);

    const radii = {
      dev: {
        both: { inner: radius * 0.45, outer: radius * 0.68 },
        developer: { inner: radius * 0.50, outer: radius * 0.95 },
        gpt: { inner: radius * 0.45, outer: radius * 0.45 },
      },
      gpt: {
        both: { inner: radius * 0.72, outer: radius * 0.95 },
        developer: { inner: radius * 0.95, outer: radius * 0.95 },
        gpt: { inner: radius * 0.50, outer: radius * 0.95 },
      }
    };

    const targetDevInner = radii.dev[speakerFilter].inner;
    const targetDevOuter = radii.dev[speakerFilter].outer;
    const targetDevOpacity = speakerFilter === 'gpt' ? 0 : 1;
    const targetDevPointerEvents = speakerFilter === 'gpt' ? 'none' : 'auto';

    const targetGptInner = radii.gpt[speakerFilter].inner;
    const targetGptOuter = radii.gpt[speakerFilter].outer;
    const targetGptOpacity = speakerFilter === 'developer' ? 0 : 1;
    const targetGptPointerEvents = speakerFilter === 'developer' ? 'none' : 'auto';

    // Groups
    let devGroup = g.select<SVGGElement>('g.dev-layer');
    if (devGroup.empty()) devGroup = g.append('g').attr('class', 'dev-layer');

    let gptGroup = g.select<SVGGElement>('g.gpt-layer');
    if (gptGroup.empty()) gptGroup = g.append('g').attr('class', 'gpt-layer');

    // Developer arcs (inner)
    const devPaths = devGroup.selectAll<SVGPathElement, d3.PieArcDatum<{ label: string; count: number }>>('path')
      .data(pie(devData), d => d.data.label);

    devPaths.exit().remove();

    const newDevPaths = devPaths.enter()
      .append('path')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .style('cursor', 'pointer');

    const allDevPaths = newDevPaths.merge(devPaths);

    allDevPaths
      .attr('fill', d => SENTI_COLORS[d.data.label] || '#64748b')
      .on('mouseover', function(event, d) {
        if (speakerFilter === 'gpt') return;
        const currentInner = (this as any)._currentInner || radii.dev.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.dev.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(currentInner - 3)
            .outerRadius(currentOuter + 8)(d) as any)
          .attr('stroke-width', 2)
          .style('filter', 'drop-shadow(0 0 14px rgba(16, 185, 129, 0.95))');

        setGlobalTooltip({
          emotion: d.data.label.toUpperCase(),
          emotionColor: SENTI_COLORS[d.data.label],
          speaker: 'Developer',
          count: d.data.count,
          percentage: `${((d.data.count / totalDev) * 100).toFixed(1)}%`,
        });
      })
      .on('mouseout', function(event, d) {
        if (speakerFilter === 'gpt') return;
        const currentInner = (this as any)._currentInner || radii.dev.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.dev.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(currentInner)
            .outerRadius(currentOuter)(d) as any)
          .attr('stroke-width', 1.5)
          .style('filter', 'none');
        setGlobalTooltip(null);
      });

    allDevPaths.transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .style('opacity', targetDevOpacity)
      .style('pointer-events', targetDevPointerEvents)
      .attrTween('d', function(d) {
        const currentInner = (this as any)._currentInner || radii.dev.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.dev.both.outer;
        const interpolateInner = d3.interpolate(currentInner, targetDevInner);
        const interpolateOuter = d3.interpolate(currentOuter, targetDevOuter);
        (this as any)._currentInner = targetDevInner;
        (this as any)._currentOuter = targetDevOuter;
        return function(t) {
          return d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(interpolateInner(t))
            .outerRadius(interpolateOuter(t))(d) as any;
        };
      });

    // GPT arcs (outer)
    const gptPaths = gptGroup.selectAll<SVGPathElement, d3.PieArcDatum<{ label: string; count: number }>>('path')
      .data(pie(gptData), d => d.data.label);

    gptPaths.exit().remove();

    const newGptPaths = gptPaths.enter()
      .append('path')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .style('cursor', 'pointer');

    const allGptPaths = newGptPaths.merge(gptPaths);

    allGptPaths
      .attr('fill', d => `url(#pattern-senti-${d.data.label.toLowerCase()})`)
      .on('mouseover', function(event, d) {
        if (speakerFilter === 'developer') return;
        const currentInner = (this as any)._currentInner || radii.gpt.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.gpt.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(currentInner - 3)
            .outerRadius(currentOuter + 8)(d) as any)
          .attr('stroke-width', 2)
          .style('filter', 'drop-shadow(0 0 14px rgba(59, 130, 246, 0.95))');

        setGlobalTooltip({
          emotion: d.data.label.toUpperCase(),
          emotionColor: SENTI_COLORS[d.data.label],
          speaker: 'GPT',
          count: d.data.count,
          percentage: `${((d.data.count / totalGpt) * 100).toFixed(1)}%`,
        });
      })
      .on('mouseout', function(event, d) {
        if (speakerFilter === 'developer') return;
        const currentInner = (this as any)._currentInner || radii.gpt.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.gpt.both.outer;

        d3.select(this)
          .transition()
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr('d', d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(currentInner)
            .outerRadius(currentOuter)(d) as any)
          .attr('stroke-width', 1.5)
          .style('filter', 'none');
        setGlobalTooltip(null);
      });

    allGptPaths.transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .style('opacity', targetGptOpacity)
      .style('pointer-events', targetGptPointerEvents)
      .attrTween('d', function(d) {
        const currentInner = (this as any)._currentInner || radii.gpt.both.inner;
        const currentOuter = (this as any)._currentOuter || radii.gpt.both.outer;
        const interpolateInner = d3.interpolate(currentInner, targetGptInner);
        const interpolateOuter = d3.interpolate(currentOuter, targetGptOuter);
        (this as any)._currentInner = targetGptInner;
        (this as any)._currentOuter = targetGptOuter;
        return function(t) {
          return d3.arc<d3.PieArcDatum<{ label: string; count: number }>>()
            .innerRadius(interpolateInner(t))
            .outerRadius(interpolateOuter(t))(d) as any;
        };
      });

    // Center text Group
    let textGroup = g.select<SVGGElement>('g.text-group');
    if (textGroup.empty()) {
      textGroup = g.append('g').attr('class', 'text-group');
      textGroup.append('text').attr('class', 'center-emoji').attr('text-anchor', 'middle');
      textGroup.append('text').attr('class', 'center-count').attr('text-anchor', 'middle');
      textGroup.append('text').attr('class', 'center-label').attr('text-anchor', 'middle');
    }

    const emojiText = speakerFilter === 'both' ? '🤖 / 👨‍💻' : (speakerFilter === 'developer' ? '👨‍💻' : '🤖');
    const countValue = speakerFilter === 'both' ? totalAll : (speakerFilter === 'developer' ? totalDev : totalGpt);
    const labelText = speakerFilter === 'both' ? 'Total turns' : (speakerFilter === 'developer' ? 'Dev turns' : 'GPT turns');

    textGroup.select('text.center-emoji')
      .transition().duration(400)
      .attr('dy', '-1.5em')
      .attr('font-size', speakerFilter === 'both' ? '20px' : '24px')
      .text(emojiText);

    textGroup.select('text.center-count')
      .transition().duration(400)
      .attr('dy', '0.4em')
      .attr('fill', '#0f172a')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text(countValue.toLocaleString());

    textGroup.select('text.center-label')
      .transition().duration(400)
      .attr('dy', '1.8em')
      .attr('fill', '#64748b')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .text(labelText.toUpperCase());

  }, [data, width, height, speakerFilter]);

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      {/* Toggle buttons for speakers */}
      <div className="flex gap-1 mb-2 bg-indigo-50/20 p-1 rounded-xl border border-indigo-100/30">
        <button
          onClick={() => setSpeakerFilter('both')}
          className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            speakerFilter === 'both'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-indigo-950 hover:bg-indigo-50/50'
          }`}
        >
          🎯 Both Rings
        </button>
        <button
          onClick={() => setSpeakerFilter('developer')}
          className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            speakerFilter === 'developer'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-blue-800 hover:bg-blue-50/40'
          }`}
        >
          👨‍💻 Developer (Inner)
        </button>
        <button
          onClick={() => setSpeakerFilter('gpt')}
          className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            speakerFilter === 'gpt'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-emerald-800 hover:bg-emerald-50/40'
          }`}
        >
          🤖 GPT (Outer)
        </button>
      </div>

      <div className="w-full h-full flex items-center justify-center">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
}

// ─── Chart S2: Direct Comparison Dev vs GPT (grouped bar) ─────────────────────
export function Senti4SDDirectComparison({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const devC: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    const gptC: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    data.forEach(t => {
      const s = t.sentiment_senti4sd || 'neutral';
      if (t.speaker === 'Developer') devC[s]++;
      else gptC[s]++;
    });

    const labels = ['positive', 'neutral', 'negative'];

    const margin = { top: 20, right: 110, bottom: 45, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(labels).range([0, innerW]).paddingInner(0.3).paddingOuter(0.15);
    const x1 = d3.scaleBand().domain(['Developer', 'GPT']).range([0, x0.bandwidth()]).padding(0.05);
    const maxY = d3.max(labels, l => Math.max(devC[l] || 0, gptC[l] || 0)) || 1;
    const y = d3.scaleLinear().domain([0, maxY]).range([innerH, 0]);

    g.append('g').selectAll('line').data(y.ticks(5)).enter().append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#f1f5f9').attr('stroke-width', 0.8);

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px').attr('dy', '10px').attr('font-weight', 'bold');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

    const barData: { label: string; speaker: string; value: number }[] = [];
    labels.forEach(l => {
      barData.push({ label: l, speaker: 'Developer', value: devC[l] });
      barData.push({ label: l, speaker: 'GPT', value: gptC[l] });
    });

    const bars = g.selectAll('.senti-bar')
      .data(barData).enter().append('rect')
      .attr('class', 'senti-bar')
      .attr('x', d => x0(d.label)! + x1(d.speaker)!)
      .attr('y', innerH).attr('width', x1.bandwidth()).attr('height', 0)
      .attr('rx', 3)
      .attr('fill', d => SENTI_COLORS[d.label])
      .attr('opacity', d => d.speaker === 'GPT' ? 0.55 : 1)
      .attr('stroke', d => d.speaker === 'GPT' ? '#475569' : 'none')
      .attr('stroke-dasharray', d => d.speaker === 'GPT' ? '2,2' : 'none')
      .attr('stroke-width', d => d.speaker === 'GPT' ? 1.2 : 0)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        g.selectAll('.senti-bar').transition().duration(250).style('opacity', 0.2);
        d3.select(event.currentTarget as SVGRectElement).raise()
          .transition().duration(250).ease(d3.easeCubicOut)
          .style('opacity', 1)
          .style('filter', `drop-shadow(0 0 8px ${sentiGlow(d.label)})`);
        setGlobalTooltip({ emotion: d.label.toUpperCase(), emotionColor: SENTI_COLORS[d.label], speaker: d.speaker as any, count: d.value });
      }).on('mouseout', () => {
        g.selectAll('.senti-bar').transition().duration(250).ease(d3.easeCubicOut)
          .style('opacity', (d: any) => d.speaker === 'GPT' ? 0.55 : 1).style('filter', 'none');
        setGlobalTooltip(null);
      });

    bars.transition().duration(800).ease(d3.easeCubicInOut)
      .attr('y', d => y(d.value)).attr('height', d => innerH - y(d.value));

    // Legend
    const leg = g.append('g').attr('transform', `translate(${innerW + 15}, 5)`);
    ['Developer', 'GPT'].forEach((sp, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2)
        .attr('fill', sp === 'Developer' ? '#64748b' : '#b8c6d6')
        .attr('stroke', sp === 'GPT' ? '#475569' : 'none')
        .attr('stroke-dasharray', sp === 'GPT' ? '2,2' : 'none')
        .attr('stroke-width', sp === 'GPT' ? 1 : 0);
      row.append('text').attr('x', 18).attr('y', 9).attr('font-size', '10px').attr('fill', '#475569').attr('font-weight', 'bold').text(sp);
    });

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 35)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Sentiment Category');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -30)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Turns Count');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart S3: Senti4SD Sentiment vs Complexity ───────────────────────────────
export function Senti4SDComplexity({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const complexities = ['Low', 'Medium', 'High'];
    const sentiments = ['positive', 'neutral', 'negative'];

    const matrix: Record<string, Record<string, number>> = {};
    complexities.forEach(c => { matrix[c] = {}; sentiments.forEach(s => { matrix[c][s] = 0; }); });

    data.filter(t => t.speaker === 'Developer').forEach(t => {
      const s = t.sentiment_senti4sd || 'neutral';
      const c = t.prompt_complexity;
      if (matrix[c] && matrix[c][s] !== undefined) matrix[c][s]++;
    });

    const margin = { top: 20, right: 120, bottom: 45, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(complexities).range([0, innerW]).paddingInner(0.28).paddingOuter(0.2);
    const x1 = d3.scaleBand().domain(sentiments).range([0, x0.bandwidth()]).padding(0.05);
    const maxY = d3.max(complexities, c => d3.max(sentiments, s => matrix[c][s]) || 0) || 1;
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
      sentiments.forEach(sentiment => {
        const val = matrix[complexity][sentiment];
        g.append('rect').attr('class', 'px-bar')
          .attr('x', x0(complexity)! + x1(sentiment)!).attr('y', innerH)
          .attr('width', x1.bandwidth()).attr('height', 0).attr('rx', 2.5)
          .attr('fill', SENTI_COLORS[sentiment])
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            g.selectAll('.px-bar').transition().duration(250).style('opacity', 0.25);
            d3.select(event.currentTarget as SVGRectElement).raise()
              .transition().duration(250).ease(d3.easeCubicOut)
              .style('opacity', 1).style('filter', `drop-shadow(0 0 6px ${sentiGlow(sentiment)})`);
            setGlobalTooltip({ emotion: sentiment.toUpperCase(), emotionColor: SENTI_COLORS[sentiment], count: val, extraFields: { Complexity: complexity } });
          }).on('mouseout', () => {
            g.selectAll('.px-bar').transition().duration(250).ease(d3.easeCubicOut)
              .style('opacity', 1).style('filter', 'none');
            setGlobalTooltip(null);
          })
          .transition().duration(800).ease(d3.easeCubicInOut).attr('y', y(val)).attr('height', innerH - y(val));
      });
    });

    const leg = g.append('g').attr('transform', `translate(${innerW + 12}, 5)`);
    sentiments.forEach((s, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', SENTI_COLORS[s]);
      row.append('text').attr('x', 17).attr('y', 9).attr('font-size', '10px').attr('font-weight', 'bold').attr('fill', '#475569').text(s.toUpperCase());
    });

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Prompt Complexity');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -28)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Developer Prompt Count');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart S4: Senti4SD Sentiment Heatmap (Dev → GPT) ────────────────────────────
export function Senti4SDHeatmap({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const devSenti = ['positive', 'neutral', 'negative'];
    const gptSenti = ['positive', 'neutral', 'negative'];

    const matrix: Record<string, Record<string, number>> = {};
    devSenti.forEach(ds => { matrix[ds] = {}; gptSenti.forEach(gs => { matrix[ds][gs] = 0; }); });

    const pairs: Record<string, { dev?: string; gpt?: string }> = {};
    data.forEach(t => {
      const pairIndex = Math.floor(t.turn_index / 2);
      const key = `${t.conversation_id}__${pairIndex}`;
      if (!pairs[key]) pairs[key] = {};
      if (t.speaker === 'Developer') pairs[key].dev = t.sentiment_senti4sd || 'neutral';
      else pairs[key].gpt = t.sentiment_senti4sd || 'neutral';
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

    const x = d3.scaleBand().domain(gptSenti).range([0, innerW]).padding(0.05);
    const y = d3.scaleBand().domain(devSenti).range([0, innerH]).padding(0.05);

    const allVals = devSenti.flatMap(ds => gptSenti.map(gs => matrix[ds][gs]));
    const maxVal = d3.max(allVals) || 1;

    const cellData = devSenti.flatMap(ds => gptSenti.map(gs => ({ ds, gs, val: matrix[ds][gs] })));

    const cells = g.selectAll('.hm-cell').data(cellData).enter()
      .append('rect').attr('class', 'hm-cell')
      .attr('x', d => x(d.gs)!).attr('y', d => y(d.ds)!)
      .attr('width', x.bandwidth()).attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', d => d3.interpolatePurples(Math.pow(d.val / maxVal, 0.5) * 0.9))
      .style('opacity', 0).style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        g.selectAll('.hm-cell').transition().duration(250).style('opacity', 0.3);
        d3.select(event.currentTarget as SVGRectElement)
          .raise().transition().duration(250).ease(d3.easeCubicOut)
          .style('opacity', 1)
          .style('filter', `drop-shadow(0 0 6px ${sentiGlow(d.ds)})`);
        setGlobalTooltip({
          emotion: d.ds.toUpperCase(),
          emotionColor: SENTI_COLORS[d.ds],
          count: d.val,
          extraFields: { 'Dev Sentiment': d.ds.toUpperCase(), 'GPT Response Sentiment': d.gs.toUpperCase() },
        });
      }).on('mouseout', () => {
        g.selectAll('.hm-cell').transition().duration(250).ease(d3.easeCubicOut).style('opacity', 1).style('filter', 'none');
        setGlobalTooltip(null);
      });

    cells.transition().duration(800).ease(d3.easeCubicInOut).style('opacity', 1);

    // Cell labels
    g.selectAll('.hm-label').data(cellData).enter().append('text')
      .attr('class', 'hm-label')
      .attr('x', d => x(d.gs)! + x.bandwidth() / 2)
      .attr('y', d => y(d.ds)! + y.bandwidth() / 2)
      .attr('dy', '.35em').attr('text-anchor', 'middle')
      .attr('font-size', '11px').attr('font-weight', '700')
      .attr('fill', d => d.val > maxVal * 0.5 ? '#fff' : '#1e293b')
      .text(d => d.val > 0 ? d.val : '');

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px').attr('dy', '10px').attr('font-weight', 'bold');

    g.append('g').call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px').attr('dx', '-5px').attr('font-weight', 'bold');

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('GPT Response Sentiment');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -75)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Developer Sentiment');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart S5: Code Blocks — AI Tone Impact ──────────────────────────────────
export function Senti4SDCodeImpact({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const gptTurns = data.filter(t => t.speaker === 'GPT');
    const sentiments = ['positive', 'neutral', 'negative'];

    const matrix: Record<string, { withCode: number; noCode: number }> = {};
    sentiments.forEach(s => { matrix[s] = { withCode: 0, noCode: 0 }; });
    gptTurns.forEach(t => {
      const s = t.sentiment_senti4sd || 'neutral';
      if (matrix[s]) {
        if (t.has_code) matrix[s].withCode++; else matrix[s].noCode++;
      }
    });

    const margin = { top: 20, right: 120, bottom: 45, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(['No Code Context', 'With Code Context']).range([0, innerW]).paddingInner(0.25).paddingOuter(0.2);
    const x1 = d3.scaleBand().domain(sentiments).range([0, x0.bandwidth()]).padding(0.08);
    const maxY = d3.max(sentiments, s => Math.max(matrix[s].withCode, matrix[s].noCode)) || 1;
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

    ['No Code Context', 'With Code Context'].forEach(category => {
      sentiments.forEach(sentiment => {
        const val = category === 'No Code Context' ? matrix[sentiment].noCode : matrix[sentiment].withCode;
        g.append('rect')
          .attr('class', 'impact-bar')
          .attr('x', x0(category)! + x1(sentiment)!)
          .attr('y', innerH).attr('width', x1.bandwidth()).attr('height', 0)
          .attr('rx', 2.5)
          .attr('fill', SENTI_COLORS[sentiment])
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            g.selectAll('.impact-bar').transition().duration(250).style('opacity', 0.25);
            d3.select(event.currentTarget as SVGRectElement).raise()
              .transition().duration(250).ease(d3.easeCubicOut)
              .style('opacity', 1)
              .style('filter', `drop-shadow(0 0 6px ${sentiGlow(sentiment)})`);
            setGlobalTooltip({
              emotion: sentiment.toUpperCase(),
              emotionColor: SENTI_COLORS[sentiment],
              count: val,
              extraFields: { 'Code Block Context': category },
            });
          }).on('mouseout', () => {
            g.selectAll('.impact-bar').transition().duration(250).ease(d3.easeCubicOut)
              .style('opacity', 1).style('filter', 'none');
            setGlobalTooltip(null);
          })
          .transition().duration(800).ease(d3.easeCubicInOut)
          .attr('y', y(val)).attr('height', innerH - y(val));
      });
    });

    // Legend
    const leg = g.append('g').attr('transform', `translate(${innerW + 12}, 5)`);
    sentiments.forEach((s, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('rect').attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', SENTI_COLORS[s]);
      row.append('text').attr('x', 17).attr('y', 9).attr('font-size', '10px').attr('font-weight', 'bold').attr('fill', '#475569').text(s.toUpperCase());
    });

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Code Presence in Prompt / Answer');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -28)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('GPT Turn Count');
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

// ─── Chart S6: Prompt Length vs Sentiment Polarity (Scatter) ──────────────────
export function Senti4SDRelation({ data, width, height }: { data: Turn[]; width: number; height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Use developer turns: x=word_count, y=sentiment_polarity (continuous compound), color=sentiment_senti4sd (discrete label)
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
      .attr('r', 4.5)
      .attr('fill', d => SENTI_COLORS[d.sentiment_senti4sd || 'neutral'])
      .attr('stroke', '#fff').attr('stroke-width', 0.8)
      .style('opacity', 0).style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const sentimentLabel = d.sentiment_senti4sd || 'neutral';
        d3.select(event.currentTarget as SVGCircleElement).raise()
          .transition().duration(250).ease(d3.easeCubicOut)
          .attr('r', 8).style('opacity', 1)
          .style('filter', `drop-shadow(0 0 6px ${sentiGlow(sentimentLabel)})`);
        setGlobalTooltip({
          emotion: sentimentLabel.toUpperCase(),
          emotionColor: SENTI_COLORS[sentimentLabel],
          speaker: d.speaker as any,
          extraFields: {
            'Prompt Length': `${d.word_count} words`,
            'VADER Compound': d.sentiment_polarity.toFixed(3),
            'Snippet': d.text_preview?.slice(0, 120),
          },
        });
      }).on('mouseout', (event, d) => {
        d3.select(event.currentTarget as SVGCircleElement)
          .transition().duration(250).ease(d3.easeCubicOut)
          .attr('r', 4.5).style('opacity', 0.75).style('filter', 'none');
        setGlobalTooltip(null);
      });

    dots.transition().duration(800).ease(d3.easeCubicInOut).style('opacity', 0.75);

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 42)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Developer Prompt Length (words)');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -36)
      .attr('text-anchor', 'middle').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600')
      .text('Sentiment Polarity Score (−1 → +1)');

    // Sentiment legend
    const legSentiments = ['positive', 'neutral', 'negative'];
    const leg = g.append('g').attr('transform', `translate(${innerW + 12}, 5)`);
    legSentiments.forEach((s, i) => {
      const row = leg.append('g').attr('transform', `translate(0,${i * 20})`);
      row.append('circle').attr('cx', 6).attr('cy', 6).attr('r', 5).attr('fill', SENTI_COLORS[s]).attr('stroke', '#fff').attr('stroke-width', 0.5);
      row.append('text').attr('x', 16).attr('y', 10).attr('font-size', '10px').attr('font-weight', 'bold').attr('fill', '#475569').text(s.toUpperCase());
    });
  }, [data, width, height]);

  return <svg ref={svgRef} className="w-full h-full" />;
}
