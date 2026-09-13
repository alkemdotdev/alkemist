export type MediaKind = 'audio' | 'video';

export type MediaTrackKind = 'captions' | 'subtitles' | 'chapters';

export interface MediaTrack {
  /** A browser-readable WebVTT track URL. */
  src: string;
  kind: MediaTrackKind;
  srclang: string;
  label: string;
  default?: boolean;
}

/** Shared browser-media inputs. HLS and DRM need a separate media element integration. */
export interface MediaProps {
  /** HTTP(S) or relative URL to a browser-supported media file. */
  src: string;
  title?: string;
  caption?: string;
  preload?: 'none' | 'metadata' | 'auto';
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playbackRates?: number[];
  seekOffset?: number;
  tracks?: MediaTrack[];
  download?: boolean;
  /** Plain-text transcript displayed in a disclosure after the player. */
  transcript?: string;
}

export interface AudioProps extends MediaProps {}

export interface VideoProps extends MediaProps {
  poster?: string;
}

const DEFAULT_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const ESCAPE = /[&<>"']/g;
const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    ESCAPE,
    (character) => ENTITIES[character]!,
  );
}

function safeUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(
      'Media src must be a non-empty HTTP(S) or relative asset URL.',
    );
  try {
    const parsed = new URL(value, 'https://alkemist.invalid/');
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error('Use an HTTP(S) or relative asset URL for media.');
  }
  return escapeHtml(value);
}

function optionalText(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
  return value;
}

function booleanAttribute(name: string, value: unknown): string {
  if (value !== undefined && typeof value !== 'boolean')
    throw new Error(`${name} must be a boolean.`);
  return value === true ? ` ${name}` : '';
}

function playbackRates(value: unknown): number[] {
  if (value === undefined) return DEFAULT_RATES;
  if (!Array.isArray(value) || !value.length)
    throw new Error(
      'playbackRates must be a non-empty array of positive numbers.',
    );
  if (
    value.some(
      (rate) => typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0,
    )
  )
    throw new Error('playbackRates must contain only positive finite numbers.');
  return [...new Set(value)];
}

function seekOffset(value: unknown): number {
  if (value === undefined) return 10;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    throw new Error('seekOffset must be a positive finite number.');
  return value;
}

function tracks(value: unknown): MediaTrack[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('tracks must be an array.');
  return value.map((track) => {
    if (!track || typeof track !== 'object')
      throw new Error('Each media track must be an object.');
    const candidate = track as Partial<MediaTrack>;
    if (!['captions', 'subtitles', 'chapters'].includes(candidate.kind ?? ''))
      throw new Error(
        'Media track kind must be captions, subtitles, or chapters.',
      );
    if (
      typeof candidate.srclang !== 'string' ||
      !candidate.srclang.trim() ||
      typeof candidate.label !== 'string' ||
      !candidate.label.trim()
    )
      throw new Error('Media tracks need non-empty srclang and label values.');
    const kind = candidate.kind as MediaTrackKind;
    return {
      src: safeUrl(candidate.src),
      kind,
      srclang: candidate.srclang,
      label: candidate.label,
      default: candidate.default === true,
    };
  });
}

/**
 * Shared escaped markup for Astro and dynamically inserted playground specimens.
 * The initial native controls remain usable until media-chrome has loaded.
 */
export function renderMedia(
  kind: MediaKind,
  props: MediaProps | VideoProps,
): string {
  if (kind !== 'audio' && kind !== 'video')
    throw new Error('Media kind must be audio or video.');
  const src = safeUrl(props.src);
  const title = optionalText(props.title, 'title')?.trim() ?? '';
  const caption = optionalText(props.caption, 'caption') ?? '';
  const transcript = optionalText(props.transcript, 'transcript') ?? '';
  const posterValue =
    kind === 'video'
      ? optionalText((props as VideoProps).poster, 'poster')
      : undefined;
  const poster = posterValue ? ` poster="${safeUrl(posterValue)}"` : '';
  if (
    props.preload !== undefined &&
    !['none', 'metadata', 'auto'].includes(props.preload)
  )
    throw new Error('preload must be none, metadata, or auto.');
  const preload = props.preload ?? 'metadata';
  const offset = seekOffset(props.seekOffset);
  const rates = playbackRates(props.playbackRates).join(' ');
  const mediaTracks = tracks(props.tracks);
  booleanAttribute('download', props.download);
  const hasCaptions = mediaTracks.some((track) => track.kind !== 'chapters');
  const label = title || `${kind === 'audio' ? 'Audio' : 'Video'} player`;
  const trackMarkup = mediaTracks
    .map(
      (track) =>
        `<track src="${track.src}" kind="${track.kind}" srclang="${escapeHtml(track.srclang)}" label="${escapeHtml(track.label)}"${booleanAttribute('default', track.default)}>`,
    )
    .join('');
  const media = `<${kind} slot="media" class="alk-media-native" controls src="${src}" preload="${preload}"${poster}${mediaTracks.length ? ' crossorigin="anonymous"' : ''}${booleanAttribute('autoplay', props.autoplay)}${booleanAttribute('muted', props.muted)}${booleanAttribute('loop', props.loop)}${kind === 'video' ? ' playsinline' : ''}>${trackMarkup}Your browser does not support ${kind} playback.</${kind}>`;
  const heading = title
    ? `<figcaption class="alk-media-heading"><h3 class="alk-media-title">${escapeHtml(title)}</h3></figcaption>`
    : '';
  const captionMarkup = caption
    ? `<p class="alk-media-caption">${escapeHtml(caption)}</p>`
    : '';
  const transcriptMarkup = transcript
    ? `<details class="alk-media-transcript"><summary>Transcript</summary><p>${escapeHtml(transcript)}</p></details>`
    : '';
  const downloadMarkup =
    props.download === true
      ? `<a class="alk-media-download" href="${src}" download>Download ${kind} <span aria-hidden="true">↓</span></a>`
      : '';

  return `<alk-media class="alk-media alk-media--${kind}" data-media-player data-state="native">
    <figure aria-label="${escapeHtml(label)}">
      ${heading}
      <media-controller${kind === 'audio' ? ' audio' : ''} class="alk-media-controller" autohide="-1" keyboardbackwardseekoffset="${offset}" keyboardforwardseekoffset="${offset}">
        ${media}
        ${kind === 'audio' && hasCaptions ? '<p class="alk-media-cues" hidden></p>' : ''}
        <media-control-bar class="alk-media-controls" aria-label="${escapeHtml(label)} controls">
          <media-play-button></media-play-button>
          <media-seek-backward-button seekoffset="${offset}"></media-seek-backward-button>
          <media-seek-forward-button seekoffset="${offset}"></media-seek-forward-button>
          <media-time-range class="alk-media-timeline"></media-time-range>
          <media-time-display showduration></media-time-display>
          <media-mute-button></media-mute-button>
          <media-volume-range></media-volume-range>
          <media-playback-rate-menu-button></media-playback-rate-menu-button>
          ${hasCaptions ? '<media-captions-menu-button></media-captions-menu-button>' : ''}
          <media-loop-button></media-loop-button>
          ${kind === 'video' ? '<media-pip-button></media-pip-button><media-airplay-button></media-airplay-button><media-fullscreen-button></media-fullscreen-button>' : ''}
        ${mediaTracks.some((track) => track.kind === 'chapters') ? '<label class="alk-media-chapters" hidden><select data-media-chapters aria-label="Choose chapter"></select></label>' : ''}
        </media-control-bar>
        <media-playback-rate-menu aria-label="Playback speed" rates="${rates}" hidden></media-playback-rate-menu>
        ${hasCaptions ? '<media-captions-menu aria-label="Caption language" hidden></media-captions-menu>' : ''}
      </media-controller>
      <p class="alk-media-status" role="status" aria-live="polite"></p>
      ${captionMarkup || downloadMarkup ? `<div class="alk-media-meta">${captionMarkup}${downloadMarkup}</div>` : ''}
      ${transcriptMarkup}
    </figure>
  </alk-media>`;
}
