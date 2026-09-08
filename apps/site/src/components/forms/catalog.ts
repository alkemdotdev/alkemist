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
      'An Enneper surface with a dense conformal coordinate net and its parameter boundary. Blue, violet, and rose follow its folded geometry, with cyan coordinates and a warm boundary.',
    note: 'mean curvature vanishes',
    equation: 'H = 0, \\qquad u^2 + v^2 \\leq 1.78^2',
    inks: ['cobalt', 'violet', 'rose', 'cyan', 'ochre'],
    make: createOrbit,
  },
  {
    id: 'strata',
    name: 'Gyroid',
    domain: 'Implicit geometry',
    subtitle: 'A periodic structure, opened in section.',
    description:
      'A sectioned gyroid nodal approximation. Teal and blue flow across its connected channels, with warm section curves revealing the interior.',
    note: 'follow the connected channels',
    equation: '\\sin x\\cos y + \\sin y\\cos z + \\sin z\\cos x = 0',
    inks: ['teal', 'cyan', 'cobalt', 'vermilion', 'ochre'],
    make: createStrata,
  },
  {
    id: 'interference',
    name: 'Dipole',
    domain: 'Field geometry',
    subtitle: 'An ideal field, resolved into its lines.',
    description:
      'Nested analytical dipole field lines around a reference sphere. A section reveals the inner families, with colored shell families and fine highlighted meridians.',
    note: 'an analytical field-line model',
    equation: 'r = L\\sin^2\\theta',
    inks: ['teal', 'cyan', 'cobalt', 'violet', 'rose', 'vermilion', 'ochre'],
    make: createInterference,
  },
  {
    id: 'assembly',
    name: 'Reduction',
    domain: 'Mechanical design',
    subtitle: 'A reduction stage, inspected from within.',
    description:
      'A sectioned planetary reduction stage with involute teeth, bearing races, a carrier, and fasteners. A cobalt housing, teal carrier, and vermilion sun gear give the detailed assembly color and hierarchy.',
    note: 'section through the assembly',
    equation: 'z_r = z_s + 2z_p = 24 + 2(16) = 56',
    inks: ['cobalt', 'teal', 'vermilion', 'ochre'],
    make: createAssembly,
  },
] as const;
export const isFormId = (value: unknown): value is FormId =>
  formStudies.some((study) => study.id === value);
