import type { FormId } from './types';
import { createOrbit } from './orbit';
import { createStrata } from './strata';
import { createInterference } from './interference';
import { createAssembly } from './assembly';

export const formStudies = [
  {
    id: 'orbit',
    name: 'Orbit',
    subtitle: 'A little space around an idea.',
    description:
      'Open bands, an off-center nucleus, and a generous gap. A precise, airy opening.',
    note: 'leave a little room',
    inks: ['cobalt', 'cyan', 'vermilion'],
    make: createOrbit,
  },
  {
    id: 'strata',
    name: 'Strata',
    subtitle: 'Let the layers do the talking.',
    description:
      'A warm stack of cut contours. More tactile, with the feeling of a model on a studio table.',
    note: 'one layer at a time',
    inks: ['rose', 'vermilion', 'ochre'],
    make: createStrata,
  },
  {
    id: 'interference',
    name: 'Interference',
    subtitle: 'Two thoughts, meeting in the middle.',
    description:
      'Two ribbons of fine ink occupy the whole opening. The most spacious and fluid direction.',
    note: 'what happens in between?',
    inks: ['cyan', 'violet', 'rose'],
    make: createInterference,
  },
  {
    id: 'assembly',
    name: 'Assembly',
    subtitle: 'A small collection of possibilities.',
    description:
      'Three objects with different structures and equal intention. A quiet inventor’s still life.',
    note: 'parts of the next idea',
    inks: ['cobalt', 'ochre', 'teal'],
    make: createAssembly,
  },
] as const;

export const isFormId = (value: unknown): value is FormId =>
  formStudies.some((study) => study.id === value);
