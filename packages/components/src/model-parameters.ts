import type { ParameterControl } from './parameters.ts';

export const modelViews = ['perspective', 'front', 'top'] as const;
export type ModelView = (typeof modelViews)[number];
export interface ModelParameterValues {
  view: ModelView;
  wireframe: boolean;
}

/** Serializable controls which can be exposed with a Model figure. */
export const modelParameters: readonly ParameterControl[] = [
  {
    name: 'view',
    label: 'Camera view',
    type: 'select',
    options: modelViews,
  },
  { name: 'wireframe', label: 'Wireframe', type: 'boolean' },
];
