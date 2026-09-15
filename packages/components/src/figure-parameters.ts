import { chartInks } from './charts.ts';
import type { ParameterControl } from './parameters.ts';

export const shaderParameters: readonly ParameterControl[] = [
  {
    name: 'frequency',
    label: 'Frequency',
    type: 'number',
    min: 3,
    max: 18,
    step: 0.1,
    legacyData: 'frequency',
  },
  {
    name: 'angle',
    label: 'Source angle',
    type: 'number',
    min: 0,
    max: 180,
    step: 1,
    suffix: '°',
    legacyData: 'angle',
  },
];
export const chartParameters: readonly ParameterControl[] = [
  {
    name: 'ink',
    label: 'Ink',
    type: 'select',
    options: chartInks,
  },
  { name: 'grid', label: 'Grid', type: 'boolean' },
  { name: 'zoom', label: 'Zoom and pan', type: 'boolean' },
];
