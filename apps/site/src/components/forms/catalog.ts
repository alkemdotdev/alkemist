import type { FormId } from './types';
import { createOrbit } from './orbit';
import { createStrata } from './strata';
import { createInterference } from './interference';
import { createAssembly } from './assembly';
import { createFluxCore } from './flux-core';
import { createToroidalWeave } from './toroidal-weave';
import { createVortexBody } from './vortex-body';
import { createKnotCore } from './knot-core';

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
export const fieldStudies = [
  {
    id: 'flux',
    name: 'Flux core',
    domain: 'Layered field sculpture',
    subtitle: 'A field with a body.',
    description:
      'Thick nested ribbons surround a ribbed warm core. Fine filaments extend the field beyond the solid layers, preserving the depth and color of the dipole direction.',
    note: 'follow the field inward',
    equation: 'r = L\\sin^2\\theta',
    inks: ['cobalt', 'cyan', 'violet', 'rose', 'vermilion'],
    make: createFluxCore,
  },
  {
    id: 'weave',
    name: 'Toroidal weave',
    domain: 'Toroidal geometry',
    subtitle: 'A dense braid around an open center.',
    description:
      'Two counterwound families weave around a warm toroidal core. Thick colored strands, over-and-under crossings, and fine surface fibers give the loop its weight.',
    note: 'one loop, many paths',
    equation: '\\varphi = \\pm3\\theta + \\varphi_0',
    inks: ['cobalt', 'teal', 'violet', 'rose', 'ochre'],
    make: createToroidalWeave,
  },
  {
    id: 'vortex',
    name: 'Vortex',
    domain: 'Helical sculpture',
    subtitle: 'Swept surfaces. A layered interior.',
    description:
      'Twelve substantial outer ribbons twist around six warm inner ribbons and a fluted core. The close waist and swept shoulders make a compact, dimensional field sculpture.',
    note: 'the interior matters',
    equation: '12\\;\\text{outer} + 6\\;\\text{inner ribbons}',
    inks: ['cobalt', 'cyan', 'violet', 'rose', 'vermilion'],
    make: createVortexBody,
  },
  {
    id: 'knot',
    name: 'Knot core',
    domain: 'Knot geometry',
    subtitle: 'One continuous, interlocking body.',
    description:
      'A thick fluted trefoil carries ten braided strands and warm inlays. Its crossings and open spaces make the structure readable as you turn it.',
    note: 'trace one continuous path',
    equation: 'T(2,3)',
    inks: ['cobalt', 'violet', 'rose', 'cyan', 'ochre'],
    make: createKnotCore,
  },
] as const;

export const allFormStudies = [...formStudies, ...fieldStudies];
export const isFormId = (value: unknown): value is FormId =>
  allFormStudies.some((study) => study.id === value);
