import type { FormId } from './types';
import { createOrbit } from './orbit';
import { createStrata } from './strata';
import { createInterference } from './interference';
import { createAssembly } from './assembly';

export const formStudies = [
  {
    id: 'orbit',
    name: 'Enneper',
    domain: 'Differential geometry',
    subtitle: 'A minimal surface, traced in coordinates.',
    description:
      'An Enneper surface with a dense conformal coordinate net and its parameter boundary. The structure is carried by curvature, fine lines, and a restrained metallic surface.',
    note: 'mean curvature vanishes',
    equation: 'H = 0, \\qquad u^2 + v^2 \\leq 1.78^2',
    inks: ['cobalt', 'cyan', 'ochre'],
    make: createOrbit,
  },
  {
    id: 'strata',
    name: 'Gyroid',
    domain: 'Implicit geometry',
    subtitle: 'A periodic structure, opened in section.',
    description:
      'A sectioned gyroid nodal approximation. Its connected channels, fine section curves, and specimen bounds make the interior structure visible.',
    note: 'follow the connected channels',
    equation: '\\sin x\\cos y + \\sin y\\cos z + \\sin z\\cos x = 0',
    inks: ['cyan', 'ochre'],
    make: createStrata,
  },
  {
    id: 'interference',
    name: 'Dipole',
    domain: 'Field geometry',
    subtitle: 'An ideal field, resolved into its lines.',
    description:
      'Nested analytical dipole field lines around a reference sphere. A section reveals the inner families, with selected meridians emphasized in cyan.',
    note: 'an analytical field-line model',
    equation: 'r = L\\sin^2\\theta',
    inks: ['cyan', 'ochre'],
    make: createInterference,
  },
  {
    id: 'assembly',
    name: 'Reduction',
    domain: 'Mechanical design',
    subtitle: 'A reduction stage, inspected from within.',
    description:
      'A sectioned planetary reduction stage with involute teeth, bearing races, a carrier, and fasteners. Material and section detail give each part a clear role.',
    note: 'section through the assembly',
    equation: 'z_r = z_s + 2z_p = 24 + 2(16) = 56',
    inks: ['ochre', 'cobalt'],
    make: createAssembly,
  },
] as const;
export const isFormId = (value: unknown): value is FormId =>
  formStudies.some((study) => study.id === value);
