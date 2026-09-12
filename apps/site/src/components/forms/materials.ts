import { INKS } from '@alkemdotdev/alkemist-theme/palette';

/** Material colors are neutral substrates; accent inks keep their shared identities. */
export const formColors: Record<string, string> = {
  ...Object.fromEntries(INKS.map(({ id, hex }) => [id, hex])),
  silver: '#b8c5cd',
  graphite: '#394953',
  construction: '#78949f',
};
