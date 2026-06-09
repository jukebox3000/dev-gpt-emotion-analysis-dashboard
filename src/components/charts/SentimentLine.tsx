'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { EMOTION_COLORS_DEV, THEME } from '@/lib/colors';
import { setGlobalTooltip } from '@/components/shared/ChartTooltip';
import type { Turn, EmotionType } from '@/lib/types';

// ─── Speaker colour constants (match the sidebar filter pills) ───────────────
const DEV_COLOR = '#3b82f6';  // blue  — Developer
const GPT_COLOR = '#10b981';  // green — GPT

// ─── Apple-style toggle ───────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  color,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 select-none cursor-pointer group"
      aria-label={`Toggle ${label}`}
    >
      {/* Track */}
      <span
        className="relative inline-block w-9 h-5 rounded-full transition-colors duration-200"
        style={{ backgroundColor: checked ? color : '#cbd5e1' }}
      >
        {/* Thumb */}
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </span>
      <span
        className="text-[12px] font-bold transition-colors duration-200"
        style={{ color: checked ? color : '#94a3b8' }}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Aggregate helpers ────────────────────────────────────────────────────────
const BUCKETS = 30; // fixed x-axis resolution

function buildAggregated(turns: Turn[], speaker: 'Developer' | 'GPT') {
  // Group by conversation
  const byConv = new Map<string, Turn[]>();
  turns.filter(t => t.speaker === speaker).forEach(t => {
    if (!byConv.has(t.conversation_id)) byConv.set(t.conversation_id, []);
    byConv.get(t.conversation_id)!.push(t);
  });

  // Normalise each convo to [0, 1] and bin into BUCKETS
  const buckets: number[][] = Array.from({ length: BUCKETS }, () => []);

  byConv.forEach(cturns => {
    const sorted = [...cturns].sort((a, b) => a.turn_index - b.turn_index);
    const n = sorted.length;
    sorted.forEach((t, i) => {
      const progress = n === 1 ? 0 : i / (n - 1); // 0 → 1
      const bucket = Math.min(BUCKETS - 1, Math.floor(progress * BUCKETS));
      buckets[bucket].push(t.sentiment_polarity);
    });
  });

  // Mean + std per bucket (only buckets with data)
  return buckets.map((vals, i) => {
    if (vals.length === 0) return null;
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    return { bucket: i, mean, std, n: vals.length };
  }).filter(Boolean) as { bucket: number; mean: number; std: number; n: number }[];
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SentimentLineProps {
  turns: Turn[];
  conversationId: string | null;
  width: number;
  height: number;
  onHoverTurn?: (turnId: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SentimentLine({
  turns,
  conversationId,
  width,
  height,
  onHoverTurn,
}: SentimentLineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showDev, setShowDev] = useState(true);
  const [showGpt, setShowGpt] = useState(true);

  // ── Single-conversation mode ──────────────────────────────────────────────
  const drawSingleConvo = useCallback((
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    x: d3.ScaleLinear<number, number>,
    y: d3.ScaleLinear<number, number>,
    convTurns: Turn[],
    innerHeight: number,
  ) => {
    const devTurns = convTurns.filter(t => t.speaker === 'Developer');
    const gptTurns = convTurns.filter(t => t.speaker === 'GPT');

    const allIndices = [...new Set(convTurns.map(t => t.turn_index))].sort((a, b) => a - b);
    const indexToPos = new Map(allIndices.map((idx, i) => [idx, i]));

    const defs = d3.select(svgRef.current).select<SVGDefsElement>('defs');

    const drawSeries = (data: Turn[], color: string, gradId: string, label: string) => {
      if (data.length < 1) return;

      const pts = data.map(t => ({
        xi: indexToPos.get(t.turn_index) ?? 0,
        y: t.sentiment_polarity,
        turn: t,
      }));

      // gradient
      const grad = defs.append('linearGradient')
        .attr('id', gradId).attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.22);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.02);

      const areaGen = d3.area<{ xi: number; y: number }>()
        .x(d => x(d.xi)).y0(y(0)).y1(d => y(d.y))
        .curve(d3.curveCatmullRom.alpha(0.5));
      const lineGen = d3.line<{ xi: number; y: number }>()
        .x(d => x(d.xi)).y(d => y(d.y))
        .curve(d3.curveCatmullRom.alpha(0.5));

      g.append('path').datum(pts).attr('fill', `url(#${gradId})`).attr('d', areaGen as any);

      const path = g.append('path').datum(pts)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5)
        .attr('d', lineGen as any);
      const len = (path.node() as SVGPathElement).getTotalLength();
      path.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len)
        .transition().duration(900).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);

      g.selectAll(`.dot-${label}`).data(pts).enter().append('circle')
        .attr('class', `dot-${label}`)
        .attr('cx', d => x(d.xi)).attr('cy', d => y(d.y))
        .attr('r', 4).attr('opacity', 0)
        .attr('fill', d => EMOTION_COLORS_DEV[d.turn.emotion_dev as EmotionType] || color)
        .attr('stroke', '#fff').attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseover', function (_, d) {
          d3.select(this).raise().transition().duration(120).attr('r', 7).attr('opacity', 1);
          onHoverTurn?.(d.turn.turn_id);
          setGlobalTooltip({
            emotion: d.turn.emotion_dev || undefined,
            emotionColor: EMOTION_COLORS_DEV[d.turn.emotion_dev as EmotionType] || color,
            speaker: d.turn.speaker,
            value: +d.y.toFixed(3),
            extraFields: { Turn: d.turn.turn_index, 'Word count': d.turn.word_count, Intent: d.turn.prompt_intent },
            textSnippet: d.turn.text_preview,
          });
        })
        .on('mouseout', function () {
          d3.select(this).transition().duration(120).attr('r', 4).attr('opacity', 0.85);
          onHoverTurn?.(null);
          setGlobalTooltip(null);
        })
        .transition().delay((_, i) => i * 35).duration(350).attr('opacity', 0.85);
    };

    if (showDev) drawSeries(devTurns, DEV_COLOR, 'agg-grad-dev', 'dev');
    if (showGpt) drawSeries(gptTurns, GPT_COLOR, 'agg-grad-gpt', 'gpt');
  }, [showDev, showGpt, onHoverTurn]);

  // ── Aggregated mode ───────────────────────────────────────────────────────
  const drawAggregate = useCallback((
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    x: d3.ScaleLinear<number, number>,
    y: d3.ScaleLinear<number, number>,
  ) => {
    const defs = d3.select(svgRef.current).select<SVGDefsElement>('defs');

    const drawSeries = (data: { bucket: number; mean: number; std: number; n: number }[], color: string, gradId: string) => {
      if (data.length < 2) return;

      const grad = defs.append('linearGradient')
        .attr('id', gradId).attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.2);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.02);

      // confidence band (mean ± std)
      const bandArea = d3.area<{ bucket: number; mean: number; std: number }>()
        .x(d => x(d.bucket)).y0(d => y(Math.max(-1, d.mean - d.std))).y1(d => y(Math.min(1, d.mean + d.std)))
        .curve(d3.curveCatmullRom.alpha(0.5));
      g.append('path').datum(data).attr('fill', color).attr('opacity', 0.1).attr('d', bandArea as any);

      // mean line
      const lineGen = d3.line<{ bucket: number; mean: number }>()
        .x(d => x(d.bucket)).y(d => y(d.mean))
        .curve(d3.curveCatmullRom.alpha(0.5));
      const path = g.append('path').datum(data)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5)
        .attr('d', lineGen as any);
      const len = (path.node() as SVGPathElement).getTotalLength();
      path.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len)
        .transition().duration(1000).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);

      // dots at each bucket
      g.selectAll(null).data(data).enter().append('circle')
        .attr('cx', d => x(d.bucket)).attr('cy', d => y(d.mean))
        .attr('r', 3.5).attr('fill', color).attr('stroke', '#fff').attr('stroke-width', 1.5).attr('opacity', 0)
        .on('mouseover', function (_, d) {
          d3.select(this).raise().transition().duration(100).attr('r', 6);
          setGlobalTooltip({
            value: +d.mean.toFixed(3),
            extraFields: { 'Progress': `${Math.round((d.bucket / BUCKETS) * 100)}%`, 'Avg ±': `±${d.std.toFixed(2)}`, 'Convos': d.n },
          });
        })
        .on('mouseout', function () {
          d3.select(this).transition().duration(100).attr('r', 3.5);
          setGlobalTooltip(null);
        })
        .transition().delay((_, i) => i * 20).duration(300).attr('opacity', 0.9);
    };

    if (showDev) drawSeries(buildAggregated(turns, 'Developer'), DEV_COLOR, 'agg-grad-dev');
    if (showGpt) drawSeries(buildAggregated(turns, 'GPT'), GPT_COLOR, 'agg-grad-gpt');
  }, [turns, showDev, showGpt]);

  // ── Main draw ─────────────────────────────────────────────────────────────
  const drawChart = useCallback(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const TOGGLE_ROW_H = 28;
    const svgHeight = Math.max(80, height - TOGGLE_ROW_H);

    const isAggregate = !conversationId;
    const margin = { top: 16, right: 16, bottom: 36, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = svgHeight - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', svgHeight);
    svg.append('defs'); // placeholder for gradient defs added later

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // placeholder if no data at all
    if (isAggregate && turns.length === 0) {
      g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', THEME.textSecondary).attr('font-size', '13px')
        .text('No turns available');
      return;
    }

    // single-convo: filter turns for this conversation
    const convTurns = isAggregate ? [] :
      turns.filter(t => t.conversation_id === conversationId)
        .sort((a, b) => a.turn_index - b.turn_index);

    if (!isAggregate && convTurns.length === 0) {
      g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', THEME.textSecondary).attr('font-size', '13px')
        .text('No turns found for this conversation');
      return;
    }

    const allIndices = isAggregate ? [] : [...new Set(convTurns.map(t => t.turn_index))].sort((a, b) => a - b);
    const xMax = isAggregate ? BUCKETS - 1 : (allIndices.length - 1 || 1);

    const x = d3.scaleLinear().domain([0, xMax]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([-1, 1]).range([innerHeight, 0]).nice();

    // Grid
    g.append('g').selectAll('line').data(y.ticks(5)).enter()
      .append('line').attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', THEME.gridLines).attr('stroke-dasharray', '2,3').attr('opacity', 0.7);

    // Zero baseline
    g.append('line').attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', '#94a3b8').attr('stroke-width', 1).attr('stroke-dasharray', '4,4').attr('opacity', 0.6);
    g.append('text').attr('x', innerWidth + 3).attr('y', y(0) + 3.5)
      .attr('fill', '#94a3b8').attr('font-size', '9px').attr('font-weight', '600').text('0');

    // Axes
    const xAxis = isAggregate
      ? d3.axisBottom(x).ticks(6).tickFormat(d => `${Math.round((+d / xMax) * 100)}%`)
      : d3.axisBottom(x).ticks(Math.min(xMax, 8)).tickFormat(d => `T${allIndices[+d] ?? +d}`);

    g.append('g').attr('transform', `translate(0,${innerHeight})`).call(xAxis.tickSize(0))
      .call(g2 => g2.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '9px').attr('dy', '1.2em');

    g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight + 30)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '10px')
      .text(isAggregate ? 'Conversation Progress' : 'Turn (conversation order)');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g2 => g2.select('.domain').attr('stroke', THEME.gridLines))
      .selectAll('text').attr('fill', THEME.textSecondary).attr('font-size', '9px');

    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -38)
      .attr('text-anchor', 'middle').attr('fill', THEME.textSecondary).attr('font-size', '10px')
      .text('Sentiment');

    // Draw series
    if (isAggregate) {
      drawAggregate(g, x, y);
    } else {
      drawSingleConvo(g, x, y, convTurns, innerHeight);
    }

  }, [turns, conversationId, width, height, drawAggregate, drawSingleConvo]);

  useEffect(() => { drawChart(); }, [drawChart]);

  return (
    <div className="relative w-full flex flex-col">
      {/* Toggle row — React controls outside SVG */}
      <div className="flex items-center gap-5 px-1 pb-1.5">
        <Toggle checked={showDev} onChange={setShowDev} color={DEV_COLOR} label="Developer" />
        <Toggle checked={showGpt} onChange={setShowGpt} color={GPT_COLOR} label="GPT" />
        {!conversationId && (
          <span className="ml-auto text-[10px] font-semibold text-slate-400 italic">
            Aggregated · {BUCKETS} buckets · shading = ±1 std dev
          </span>
        )}
      </div>
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
