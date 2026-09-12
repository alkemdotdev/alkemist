import { writeFile, mkdir } from 'node:fs/promises';
import { format } from 'prettier';
import { ALK_INKS, inkContrast } from '../packages/theme/src/palette.ts';
await writeFile(
  new URL('../packages/theme/src/inks.css', import.meta.url),
  `/* Generated from palette.ts by npm run generate:palette. */\n:root {\n${ALK_INKS.map((ink) => `  --alk-ink-${ink.id}: ${ink.hex};`).join('\n')}\n}\n`,
);
await mkdir(new URL('../apps/site/public/test/', import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL('../apps/site/public/test/inks.json', import.meta.url),
  await format(
    JSON.stringify(
      {
        name: 'Alkemist eight inks',
        version: 1,
        backgrounds: ['#111111', '#eeeeee'],
        usage:
          'Same inks in both themes. Graphical marks and large notes on either board; normal text on a blackboard. Use neutral foreground for small whiteboard text.',
        colors: ALK_INKS.map((ink) => ({
          ...ink,
          contrastBlackboard: inkContrast(ink.hex, '#111111'),
          contrastWhiteboard: inkContrast(ink.hex, '#eeeeee'),
        })),
      },
      null,
      2,
    ),
    { parser: 'json' },
  ),
);
console.log('Generated shared ink tokens and downloadable palette.');
