export type JSONPrimitive = string | number | boolean | null;
/** Undefined object members are omitted by JSON.stringify; arrays remain strict JSON arrays. */
export type JSONValue =
  JSONPrimitive | JSONValue[] | { [key: string]: JSONValue | undefined };

export interface PlaygroundControl {
  name: string;
  label?: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'json';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  help?: string;
}

export interface PlaygroundPreset {
  label: string;
  values: Record<string, JSONValue>;
}

export interface PlaygroundDefinition {
  id: string;
  name: string;
  importPath?: string;
  defaults: Record<string, JSONValue>;
  controls: PlaygroundControl[];
  presets?: PlaygroundPreset[];
  /** Text rendered between the generated component tags. */
  slot?: string;
  /** Render this string prop as an escaped text child in generated examples. */
  textSlotProp?: string;
}

export interface PlaygroundValidation {
  values: Record<string, JSONValue>;
  errors: Record<string, string>;
  valid: boolean;
}

export function resetPlaygroundValues(
  definition: PlaygroundDefinition,
): Record<string, JSONValue> {
  return structuredClone(definition.defaults);
}

export function presetPlaygroundValues(
  definition: PlaygroundDefinition,
  preset: PlaygroundPreset,
): Record<string, JSONValue> {
  return {
    ...resetPlaygroundValues(definition),
    ...structuredClone(preset.values),
  };
}

function isJsonValue(value: unknown): value is JSONValue {
  if (
    value === null ||
    ['string', 'number', 'boolean'].includes(typeof value)
  ) {
    return typeof value !== 'number' || Number.isFinite(value);
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  return (
    typeof value === 'object' &&
    Object.values(value as object).every(
      (member) => member === undefined || isJsonValue(member),
    )
  );
}

function errorForControl(
  control: PlaygroundControl,
  value: unknown,
): string | undefined {
  if (!isJsonValue(value)) return 'Enter valid JSON-compatible data.';
  if (control.type === 'text' || control.type === 'textarea') {
    return typeof value === 'string' ? undefined : 'Enter text.';
  }
  if (control.type === 'boolean') {
    return typeof value === 'boolean' ? undefined : 'Choose on or off.';
  }
  if (control.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value))
      return 'Enter a finite number.';
    if (control.min !== undefined && value < control.min)
      return `Enter a value of at least ${control.min}.`;
    if (control.max !== undefined && value > control.max)
      return `Enter a value no greater than ${control.max}.`;
  }
  if (control.type === 'select') {
    if (typeof value !== 'string') return 'Choose an option.';
    if (control.options && !control.options.includes(value))
      return 'Choose one of the listed options.';
  }
  return undefined;
}

/** Validates only declared controls and preserves other documented defaults. */
export function validatePlaygroundValues(
  definition: PlaygroundDefinition,
  candidate: Record<string, unknown>,
): PlaygroundValidation {
  const values: Record<string, JSONValue> = {
    ...resetPlaygroundValues(definition),
  };
  const errors: Record<string, string> = {};
  for (const control of definition.controls) {
    const value = Object.hasOwn(candidate, control.name)
      ? candidate[control.name]
      : values[control.name];
    const error = errorForControl(control, value);
    if (error) errors[control.name] = error;
    else values[control.name] = value as JSONValue;
  }
  return { values, errors, valid: Object.keys(errors).length === 0 };
}

export function escapePlaygroundSource(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  );
}

function propLines(values: Record<string, JSONValue>): string[] {
  return Object.entries(values).map(
    ([name, value]) => `  ${name}={${JSON.stringify(value)}}`,
  );
}

/** Creates display-only Astro or HTML source; caller must still render it as text. */
export function playgroundSource(
  definition: PlaygroundDefinition,
  values: Record<string, JSONValue>,
): string {
  const textValue = definition.textSlotProp
    ? values[definition.textSlotProp]
    : undefined;
  // Text slots may normalize author whitespace; retain the exact prop when that matters.
  const textChild =
    typeof textValue === 'string' &&
    textValue.length > 0 &&
    textValue.trim() === textValue
      ? textValue
      : undefined;
  if (definition.slot && definition.textSlotProp)
    throw new Error(
      'A playground definition must choose markup slot or textSlotProp.',
    );
  const props = propLines(
    Object.fromEntries(
      Object.entries(values).filter(
        ([name]) => textChild === undefined || name !== definition.textSlotProp,
      ),
    ),
  );
  const hasSlot = Boolean(definition.slot);
  if (definition.importPath) {
    const component =
      definition.name.replace(/[^A-Za-z0-9_$]/g, '') || 'Component';
    const opening = [
      `---`,
      `import ${component} from ${JSON.stringify(definition.importPath)};`,
      `---`,
      '',
      `<${component}`,
      ...props,
    ];
    if (textChild !== undefined) {
      const escaped = textChild
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${')
        .replace(/\r/g, '\\r');
      return `${opening.join('\n')}>{\`\n${escaped}\n\`}</${component}>`;
    }
    return hasSlot
      ? `${opening.join('\n')}>\n  ${definition.slot ?? ''}\n</${component}>`
      : `${opening.join('\n')}\n/>`;
  }
  const data = escapePlaygroundSource(JSON.stringify(values));
  const label = escapePlaygroundSource(definition.name);
  const slot = escapePlaygroundSource(definition.slot ?? '');
  return `<div data-component="${label}" data-props='${data}'>${slot}</div>`;
}
