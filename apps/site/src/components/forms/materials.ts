import { ALK_INKS } from '@alkemist/ui/palette';

/** Material colors are neutral substrates; accent inks keep their shared identities. */
export const formColors: Record<string, string> = {
  ...Object.fromEntries(ALK_INKS.map(({ id, hex }) => [id, hex])),
  silver: '#b8c5cd',
  graphite: '#394953',
  construction: '#78949f',
};
