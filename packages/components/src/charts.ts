import type { TopLevelSpec } from 'vega-lite';

export type ChartType =
  'line' | 'bar' | 'scatter' | 'pie' | 'donut' | 'heatmap';
export type ChartFieldType =
  'quantitative' | 'temporal' | 'nominal' | 'ordinal';
export type ChartInk =
  | 'cobalt'
  | 'cyan'
  | 'teal'
  | 'fern'
  | 'ochre'
  | 'vermilion'
  | 'rose'
  | 'violet';

export interface ChartProps {
  id?: string;
  src: string;
  type: ChartType;
  x: string;
  y: string;
  title: string;
  description: string;
  xLabel?: string;
  yLabel?: string;
  xType?: ChartFieldType;
  color?: string;
  colorLabel?: string;
  value?: string;
  valueLabel?: string;
  ink?: ChartInk;
  height?: number;
  grid?: boolean;
  zoom?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  caption?: string;
  sample?: boolean;
}

export interface ChartTheme {
  text: string;
  rule: string;
  inks: Record<ChartInk, string>;
}

export type ChartRow = Record<string, string | number | null>;

export const chartInks: ChartInk[] = [
  'cobalt',
  'cyan',
  'teal',
  'fern',
  'ochre',
  'vermilion',
  'rose',
  'violet',
];

function literalField(field: string): string {
  return field
    .replaceAll('\\', '\\\\')
    .replaceAll('.', '\\.')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]');
}

export function chartXType(config: ChartProps): ChartFieldType {
  return (
    config.xType ??
    (['bar', 'pie', 'donut'].includes(config.type)
      ? 'nominal'
      : config.type === 'heatmap'
        ? 'ordinal'
        : 'quantitative')
  );
}

export function chartCanZoom(config: ChartProps): boolean {
  return (
    config.zoom !== false &&
    ['line', 'scatter'].includes(config.type) &&
    ['quantitative', 'temporal'].includes(chartXType(config))
  );
}

/** Parse only explicitly numeric columns; identifiers and category labels stay intact. */
export function prepareChartRows(
  raw: ChartRow[],
  config: ChartProps,
): ChartRow[] {
  if (!raw.length) throw new Error('The CSV contains no data rows.');
  const required = [
    config.x,
    config.y,
    config.color,
    config.type === 'heatmap' ? config.value : undefined,
  ].filter((field): field is string => Boolean(field));
  if (config.type === 'heatmap' && !config.value)
    throw new Error('A heatmap requires a value column.');
  for (const field of required) {
    if (!Object.hasOwn(raw[0], field))
      throw new Error(`The CSV is missing the “${field}” column.`);
  }
  const numeric = new Set<string>();
  if (chartXType(config) === 'quantitative') numeric.add(config.x);
  if (config.type !== 'heatmap') numeric.add(config.y);
  if (config.type === 'heatmap' && config.value) numeric.add(config.value);
  if (config.type === 'heatmap') {
    for (const field of [config.x, config.y]) {
      if (
        raw.every(
          (row) =>
            row[field] !== null &&
            String(row[field]).trim() !== '' &&
            Number.isFinite(Number(row[field])),
        )
      )
        numeric.add(field);
    }
  }
  const rows = raw.map((source, index) => {
    const row = { ...source };
    for (const field of numeric) {
      const value = source[field];
      if (value === null || String(value).trim() === '') {
        row[field] = null;
      } else {
        const number = Number(value);
        if (!Number.isFinite(number))
          throw new Error(
            `Row ${index + 2}: “${field}” must contain a finite number.`,
          );
        if (
          ['pie', 'donut'].includes(config.type) &&
          field === config.y &&
          number < 0
        )
          throw new Error(
            `Row ${index + 2}: pie and donut values cannot be negative.`,
          );
        row[field] = number;
      }
    }
    if (chartXType(config) === 'temporal') {
      const value = row[config.x];
      if (value === null || String(value).trim() === '') {
        row[config.x] = null;
      } else if (!Number.isFinite(Date.parse(String(value)))) {
        throw new Error(
          `Row ${index + 2}: “${config.x}” must contain a valid date.`,
        );
      }
    }
    return row;
  });
  for (const field of numeric) {
    if (rows.every((row) => row[field] === null))
      throw new Error(`The “${field}” column contains no numeric values.`);
  }
  if (
    chartXType(config) === 'temporal' &&
    rows.every((row) => row[config.x] === null)
  )
    throw new Error(`The “${config.x}” column contains no dates.`);
  if (
    ['pie', 'donut'].includes(config.type) &&
    !rows.some((row) => Number(row[config.y]) > 0)
  )
    throw new Error(
      'Pie and donut charts require at least one positive value.',
    );
  return rows;
}

/** Presets remain small; the Vega-Lite engine owns scales, marks, and interactions. */
export function createChartSpec(
  config: ChartProps,
  rows: ChartRow[],
  theme: ChartTheme,
  width: number,
): TopLevelSpec {
  const palette = chartInks.map((ink) => theme.inks[ink]);
  const categorical =
    config.color ??
    (['bar', 'pie', 'donut'].includes(config.type) ? config.x : undefined);
  const color = categorical
    ? {
        field: literalField(categorical),
        type: 'nominal' as const,
        title: config.colorLabel ?? categorical,
        scale: {
          domain: [...new Set(rows.map((row) => row[categorical]))],
          range: palette,
        },
        legend:
          config.type === 'bar' && !config.color
            ? null
            : {
                orient: 'bottom' as const,
                columns: width < 420 ? 2 : 4,
                labelLimit: Math.max(65, width / (width < 420 ? 2 : 4) - 42),
              },
      }
    : { value: theme.inks[config.ink ?? 'cobalt'] };
  const base = {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    description: config.description,
    width,
    height: config.height ?? 300,
    padding: 6,
    autosize: { type: 'fit' as const, contains: 'padding' as const },
    background: 'transparent',
    data: { values: rows },
    config: {
      font: 'Ubuntu',
      view: { stroke: null },
      axis: {
        grid: config.grid !== false,
        gridColor: theme.rule,
        domainColor: theme.rule,
        tickColor: theme.rule,
        labelColor: theme.text,
        titleColor: theme.text,
        labelFont: 'Ubuntu Mono',
        titleFont: 'Ubuntu',
        labelFontSize: 12,
        titleFontSize: 12,
        titleFontWeight: 400 as const,
        titlePadding: 14,
        labelPadding: 7,
        labelLimit: 120,
        tickCount: Math.max(3, Math.round(width / 100)),
      },
      legend: {
        labelColor: theme.text,
        titleColor: theme.text,
        labelFont: 'Ubuntu',
        titleFont: 'Ubuntu',
        titleFontWeight: 400 as const,
        labelFontSize: 12,
        symbolSize: 80,
        padding: 10,
        rowPadding: 7,
      },
    },
  };
  const x = {
    field: literalField(config.x),
    type: chartXType(config),
    title: config.xLabel ?? config.x,
    axis:
      config.type === 'bar' &&
      !config.horizontal &&
      width < 420 &&
      ['nominal', 'ordinal'].includes(chartXType(config))
        ? { labelAngle: -55, labelLimit: 70, labelOverlap: 'greedy' as const }
        : { labelAngle: 0 },
    ...(chartXType(config) === 'quantitative'
      ? { scale: { zero: false } }
      : {}),
  };
  const y = {
    field: literalField(config.y),
    type: 'quantitative' as const,
    title: config.yLabel ?? config.y,
  };
  const tooltip = [
    {
      field: literalField(config.x),
      type: chartXType(config),
      title: config.xLabel ?? config.x,
    },
    {
      field: literalField(config.y),
      type:
        config.type === 'heatmap'
          ? ('ordinal' as const)
          : ('quantitative' as const),
      title: config.yLabel ?? config.y,
    },
    ...(config.color
      ? [
          {
            field: literalField(config.color),
            type: 'nominal' as const,
            title: config.colorLabel ?? config.color,
          },
        ]
      : []),
  ];
  if (config.type === 'pie' || config.type === 'donut') {
    return {
      ...base,
      mark: {
        type: 'arc',
        innerRadius:
          config.type === 'donut'
            ? Math.min(width, config.height ?? 300) * 0.22
            : 0,
        padAngle: 0.015,
        cornerRadius: 2,
      },
      encoding: { theta: { ...y, stack: true }, color, tooltip },
    };
  }
  if (config.type === 'heatmap') {
    return {
      ...base,
      mark: { type: 'rect', tooltip: true },
      encoding: {
        x: {
          ...x,
          scale: { paddingInner: 0.04 },
          axis: { labelAngle: 0, labelOverlap: true },
        },
        y: {
          field: literalField(config.y),
          type: 'ordinal',
          title: config.yLabel ?? config.y,
          scale: { paddingInner: 0.04 },
          sort: 'descending',
          axis: { labelOverlap: true },
        },
        color: {
          field: literalField(config.value!),
          type: 'quantitative',
          title: config.valueLabel ?? config.value,
          scale: {
            range: ['#253f67', theme.inks.cobalt, '#b6d6f6'],
            interpolate: 'lab',
          },
          legend: {
            orient: 'bottom',
            gradientLength: Math.max(100, Math.min(240, width - 55)),
          },
        },
        tooltip: [
          ...tooltip,
          {
            field: literalField(config.value!),
            type: 'quantitative',
            title: config.valueLabel ?? config.value,
          },
        ],
      },
    };
  }
  if (config.type === 'bar') {
    const magnitude = {
      ...y,
      stack: config.stacked ? ('zero' as const) : null,
    };
    return {
      ...base,
      mark: { type: 'bar', cornerRadiusEnd: 2 },
      encoding: {
        x: config.horizontal ? magnitude : x,
        y: config.horizontal ? { ...x, axis: { labelAngle: 0 } } : magnitude,
        ...(!config.stacked && config.color && config.color !== config.x
          ? config.horizontal
            ? { yOffset: { field: literalField(config.color) } }
            : { xOffset: { field: literalField(config.color) } }
          : {}),
        color,
        tooltip,
      },
    };
  }
  return {
    ...base,
    ...(chartCanZoom(config)
      ? {
          params: [
            {
              name: 'alk_window',
              select: {
                type: 'interval' as const,
                encodings:
                  config.type === 'scatter'
                    ? ['x' as const, 'y' as const]
                    : ['x' as const],
                zoom: 'wheel![event.shiftKey]',
              },
              bind: 'scales' as const,
            },
          ],
        }
      : {}),
    mark:
      config.type === 'line'
        ? {
            type: 'line',
            strokeWidth: 2.5,
            clip: true,
            point: { filled: true, size: 8 },
          }
        : { type: 'point', filled: true, size: 36, opacity: 0.85, clip: true },
    encoding: { x, y: { ...y, scale: { zero: false } }, color, tooltip },
  };
}
