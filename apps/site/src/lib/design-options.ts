export const designChoices = [
  {
    key: 'font',
    label: 'Font pairing',
    options: [
      {
        value: 'ubuntu',
        label: 'Ubuntu + Ubuntu Mono',
        hint: 'Suggested · friendly, distinctive, technical',
      },
      {
        value: 'plex',
        label: 'IBM Plex Sans + Mono',
        hint: 'Quieter, more neutral; compare the same text',
      },
    ],
  },
  {
    key: 'heading',
    label: 'Headline voice',
    options: [
      { value: 'sans', label: 'Sans serif', hint: 'Direct and approachable' },
      {
        value: 'serif',
        label: 'Serif',
        hint: 'Plex Serif · a more academic opening',
      },
      {
        value: 'mono',
        label: 'Monospaced',
        hint: 'Technical; wider letter spacing',
      },
    ],
  },
  {
    key: 'board',
    label: 'Board surface',
    options: [
      { value: 'white', label: 'Whiteboard', hint: '#eeeeee · dry-erase ink' },
      { value: 'black', label: 'Blackboard', hint: '#111111 · colored chalk' },
    ],
  },
  {
    key: 'palette',
    label: 'Accent palette',
    options: [
      {
        value: 'color',
        label: 'Multiple inks',
        hint: 'Separate the signal, notes, and emphasis',
      },
      {
        value: 'single',
        label: 'One accent',
        hint: 'The same cobalt on both boards',
      },
      {
        value: 'mono',
        label: 'Monochrome',
        hint: 'Keep all marks in the foreground ink',
      },
    ],
  },
  {
    key: 'take',
    label: 'Layout direction',
    options: [
      { value: 'workshop', label: 'Workshop', hint: 'An open working session' },
      { value: 'seminar', label: 'Seminar', hint: 'A quiet research notebook' },
      {
        value: 'drafting',
        label: 'Drafting',
        hint: 'A measured engineering plate',
      },
    ],
  },
] as const;

export const designDetails = [
  {
    key: 'bold',
    label: 'Stronger headings',
    hint: 'More weight in titles and the wordmark',
    group: 'type',
    initial: true,
  },
  {
    key: 'handwriting',
    label: 'Handwritten notes',
    hint: 'Caveat annotations instead of monospaced labels',
    group: 'type',
    initial: true,
  },
  {
    key: 'notes',
    label: 'Show annotations',
    hint: 'Figure callouts and notes in the margins',
    group: 'ink',
    initial: true,
  },
  {
    key: 'underline',
    label: 'Marker underline',
    hint: 'A drawn stroke beneath the headline',
    group: 'ink',
    initial: true,
  },
  {
    key: 'chalk',
    label: 'Soft chalk edges',
    hint: 'A subtle irregular edge on the graph trace',
    group: 'ink',
    initial: false,
  },
  {
    key: 'grid',
    label: 'Graph grid',
    hint: 'Faint coordinate lines behind the signal',
    group: 'ink',
    initial: true,
  },
  {
    key: 'frame',
    label: 'Frame the figure',
    hint: 'A border and registration marks',
    group: 'shape',
    initial: false,
  },
  {
    key: 'rounded',
    label: 'Rounded controls',
    hint: 'Soft corners instead of square edges',
    group: 'shape',
    initial: true,
  },
  {
    key: 'tray',
    label: 'Marker tray',
    hint: 'A small row of ink sticks below the experiment',
    group: 'shape',
    initial: true,
  },
  {
    key: 'symbol',
    label: 'Symbol beside the wordmark',
    hint: 'Keep the small star next to Alkemist',
    group: 'shape',
    initial: true,
  },
  {
    key: 'dividers',
    label: 'Section rules',
    hint: 'Thin lines separate the content',
    group: 'shape',
    initial: true,
  },
  {
    key: 'roomy',
    label: 'Roomier spacing',
    hint: 'More breathing room around the opening',
    group: 'shape',
    initial: true,
  },
  {
    key: 'lines',
    label: 'Code line numbers',
    hint: 'A numbered gutter beside the source sample',
    group: 'shape',
    initial: false,
  },
] as const;

type Choice = (typeof designChoices)[number];
type Detail = (typeof designDetails)[number];
export type DesignOptions = {
  [Key in Choice['key']]: Extract<
    Choice,
    { key: Key }
  >['options'][number]['value'];
} & Record<Detail['key'], boolean>;

export const suggestedDesign: DesignOptions = {
  font: 'ubuntu',
  heading: 'sans',
  board: 'white',
  palette: 'color',
  take: 'workshop',
  ...Object.fromEntries(
    designDetails.map((detail) => [detail.key, detail.initial]),
  ),
} as DesignOptions;

// Shared URL, storage, export, and frame-message boundary. Only known values survive.
export function readDesignOptions(input: unknown): DesignOptions {
  const record =
    input instanceof URLSearchParams
      ? Object.fromEntries(input)
      : input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
  const result: Record<string, string | boolean> = { ...suggestedDesign };
  for (const choice of designChoices) {
    const value = Object.hasOwn(record, choice.key)
      ? record[choice.key]
      : undefined;
    if (choice.options.some((option) => option.value === value))
      result[choice.key] = value as string;
  }
  for (const detail of designDetails) {
    const value = Object.hasOwn(record, detail.key)
      ? record[detail.key]
      : undefined;
    if (value === true || value === '1' || value === 'true')
      result[detail.key] = true;
    else if (value === false || value === '0' || value === 'false')
      result[detail.key] = false;
  }
  return result as DesignOptions;
}

export function designParams(options: DesignOptions): URLSearchParams {
  return new URLSearchParams(
    Object.entries(readDesignOptions(options)).map(([key, value]) => [
      key,
      typeof value === 'boolean' ? (value ? '1' : '0') : value,
    ]),
  );
}

export function designSummary(options: DesignOptions): string {
  return [
    'Alkemist — aesthetic choices',
    '',
    ...designChoices.map(
      (choice) =>
        `${choice.label}: ${choice.options.find((option) => option.value === options[choice.key])!.label}`,
    ),
    '',
    ...designDetails.map(
      (detail) => `[${options[detail.key] ? 'x' : ' '}] ${detail.label}`,
    ),
  ].join('\n');
}
