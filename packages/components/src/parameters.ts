/** A small, serializable control description shared by live figures. */
export type ParameterControl =
  | {
      name: string;
      label: string;
      type: 'number';
      min: number;
      max: number;
      step: number;
      suffix?: string;
      legacyData?: string;
    }
  | {
      name: string;
      label: string;
      type: 'select';
      options: readonly string[];
    }
  | { name: string; label: string; type: 'boolean' };

/** `true` exposes a figure's documented controls; an array selects named controls. */
export type ParametersProp<Key extends string = string> =
  boolean | readonly Key[];

export type ParameterValues = Record<string, string | number | boolean>;

const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );

export function exposedParameters(
  controls: readonly ParameterControl[],
  parameters: ParametersProp | undefined,
  defaultValue: boolean,
): ParameterControl[] {
  const enabled = parameters ?? defaultValue;
  if (enabled === false) return [];
  if (enabled === true) return [...controls];
  if (!Array.isArray(enabled))
    throw new Error(
      'parameters must be true, false, or an array of known keys.',
    );
  const known = new Set(controls.map((control) => control.name));
  for (const name of enabled) {
    if (typeof name !== 'string' || !known.has(name))
      throw new Error(`Unknown parameter “${String(name)}”.`);
  }
  const requested = new Set(enabled);
  return controls.filter((control) => requested.has(control.name));
}

/** Rejects undeclared, non-finite, out-of-range, and invalid-option patches. */
export function validateParameters(
  controls: readonly ParameterControl[],
  patch: Record<string, unknown>,
): ParameterValues {
  const known = new Map(controls.map((control) => [control.name, control]));
  const values: ParameterValues = {};
  for (const [name, value] of Object.entries(patch)) {
    const control = known.get(name);
    if (!control) throw new Error(`Unknown parameter “${name}”.`);
    if (control.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw new Error(`Parameter “${name}” must be a finite number.`);
      if (value < control.min || value > control.max)
        throw new Error(
          `Parameter “${name}” must be between ${control.min} and ${control.max}.`,
        );
      const steps = (value - control.min) / control.step;
      if (Math.abs(steps - Math.round(steps)) > 1e-9)
        throw new Error(
          `Parameter “${name}” must use increments of ${control.step}.`,
        );
    } else if (control.type === 'boolean') {
      if (typeof value !== 'boolean')
        throw new Error(`Parameter “${name}” must be true or false.`);
    } else if (typeof value !== 'string' || !control.options.includes(value)) {
      throw new Error(`Parameter “${name}” must be one of its listed options.`);
    }
    values[name] = value as string | number | boolean;
  }
  return values;
}

export function renderParameters(
  controls: readonly ParameterControl[],
  values: ParameterValues,
): string {
  if (!controls.length) return '';
  const fields = controls
    .map((control) => {
      const value = values[control.name];
      if (control.type === 'boolean')
        return `<label class="alk-parameters-toggle"><input type="checkbox" data-parameter="${escape(control.name)}"${value ? ' checked' : ''} disabled /> ${escape(control.label)}</label>`;
      if (control.type === 'select')
        return `<label><span>${escape(control.label)}</span><select data-parameter="${escape(control.name)}" disabled>${control.options.map((option) => `<option value="${escape(option)}"${option === value ? ' selected' : ''}>${escape(option)}</option>`).join('')}</select></label>`;
      const legacy = control.legacyData
        ? ` data-${escape(control.legacyData)}`
        : '';
      const numeric = Number(value);
      const output = `${numeric.toFixed(control.step < 1 ? 1 : 0)}${control.suffix ?? ''}`;
      return `<label><span>${escape(control.label)} <output data-parameter-output="${escape(control.name)}">${escape(output)}</output></span><input type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${numeric}" data-parameter="${escape(control.name)}"${legacy} disabled /></label>`;
    })
    .join('');
  return `<div class="alk-parameters" data-parameters><div class="alk-parameters-fields">${fields}</div><button type="button" data-parameters-reset disabled>Reset values</button></div>`;
}
