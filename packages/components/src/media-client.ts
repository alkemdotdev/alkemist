const PLAYER_SELECTOR = '[data-media-player]';
const cleanups = new WeakMap<HTMLElement, () => void>();

function setStatus(
  player: HTMLElement,
  message: string,
  state: 'loading' | 'ready' | 'error',
) {
  player.dataset.state = state;
  const status = player.querySelector<HTMLElement>('.alk-media-status');
  if (status) status.textContent = message;
}

async function upgradePlayer(player: HTMLElement): Promise<void> {
  if (player.dataset.mediaUpgraded || player.dataset.mediaLoading) return;
  player.dataset.mediaLoading = 'true';
  try {
    await Promise.all([import('media-chrome'), import('media-chrome/menu')]);
    const required = [
      'media-controller',
      'media-control-bar',
      'media-play-button',
      'media-seek-backward-button',
      'media-seek-forward-button',
      'media-time-range',
      'media-time-display',
      'media-mute-button',
      'media-volume-range',
      'media-playback-rate-button',
      'media-loop-button',
      'media-playback-rate-menu',
      'media-playback-rate-menu-button',
      'media-captions-menu',
      'media-captions-menu-button',
      'media-pip-button',
      'media-airplay-button',
      'media-fullscreen-button',
    ];
    await Promise.all(required.map((name) => customElements.whenDefined(name)));
    if (!player.isConnected) return;
    const media = player.querySelector<HTMLMediaElement>('.alk-media-native');
    if (!media) throw new Error('The native media element is missing.');
    // Only remove the fallback after all needed custom elements have upgraded.
    const loop = player.querySelector('media-loop-button');
    loop?.setAttribute('role', 'switch');
    loop?.setAttribute('aria-checked', String(media.loop));
    media.removeAttribute('controls');
    player.dataset.mediaUpgraded = 'true';
    if (player.dataset.state !== 'error')
      setStatus(player, 'Media is ready.', 'ready');
  } catch {
    // Keep native controls intact: a failed optional enhancement must not block playback.
    setStatus(
      player,
      'Enhanced controls could not load; native media controls remain available.',
      'error',
    );
  } finally {
    delete player.dataset.mediaLoading;
  }
}

function observePlayer(player: HTMLElement) {
  if (cleanups.has(player)) return;
  const lifecycle = new AbortController();
  const signal = lifecycle.signal;
  let observer: IntersectionObserver | undefined;
  cleanups.set(player, () => {
    lifecycle.abort();
    observer?.disconnect();
    cleanups.delete(player);
  });
  const media = player.querySelector<HTMLMediaElement>('.alk-media-native');
  if (media) {
    media.addEventListener(
      'loadstart',
      () => setStatus(player, 'Loading media.', 'loading'),
      { signal },
    );
    media.addEventListener(
      'waiting',
      () => setStatus(player, 'Buffering media.', 'loading'),
      { signal },
    );
    media.addEventListener(
      'canplay',
      () => {
        if (player.dataset.state !== 'error')
          setStatus(player, 'Media is ready.', 'ready');
      },
      { signal },
    );
    media.addEventListener(
      'error',
      () =>
        setStatus(
          player,
          'Media could not be loaded. Check the media URL and format.',
          'error',
        ),
      { signal },
    );
    const trackElements = media.querySelectorAll('track');
    for (const track of trackElements) {
      track.addEventListener(
        'error',
        () =>
          setStatus(
            player,
            `The ${track.label || 'text'} track could not be loaded.`,
            'error',
          ),
        { signal },
      );
    }
    setupChapterSelector(player, media, signal);
    setupAudioCaptions(player, media, signal);
    setupPictureInPicture(player, media, signal);
    if (media.error) {
      setStatus(
        player,
        'Media could not be loaded. Check the media URL and format.',
        'error',
      );
    } else if (
      Array.from(trackElements).some(
        (track) => track.readyState === HTMLTrackElement.ERROR,
      )
    ) {
      setStatus(player, 'A text track could not be loaded.', 'error');
    } else if (media.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      setStatus(player, 'Media is ready.', 'ready');
    }
  }
  if (player.dataset.mediaUpgraded) return;
  if (!('IntersectionObserver' in window)) {
    void upgradePlayer(player);
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer?.disconnect();
      void upgradePlayer(player);
    },
    { rootMargin: '240px 0px' },
  );
  observer.observe(player);
}

function setupChapterSelector(
  player: HTMLElement,
  media: HTMLMediaElement,
  signal: AbortSignal,
) {
  const label = player.querySelector<HTMLLabelElement>('.alk-media-chapters');
  const select = label?.querySelector<HTMLSelectElement>(
    '[data-media-chapters]',
  );
  if (!label || !select) return;
  const populate = () => {
    const chapterTrack = Array.from(media.textTracks).find(
      (track) => track.kind === 'chapters',
    );
    if (!chapterTrack) return;
    chapterTrack.mode = 'hidden';
    if (!chapterTrack.cues?.length) return;
    select.replaceChildren(new Option('Chapters', ''));
    for (const cue of Array.from(chapterTrack.cues)) {
      const text = (cue as VTTCue).text || cue.id || 'Untitled chapter';
      const option = new Option(text, String(cue.startTime));
      select.add(option);
    }
    label.hidden = false;
  };
  const followPlayback = () => {
    const track = Array.from(media.textTracks).find(
      (track) => track.kind === 'chapters',
    );
    const cue = Array.from(track?.cues ?? []).find(
      (cue) =>
        media.currentTime >= cue.startTime && media.currentTime < cue.endTime,
    );
    select.value = cue ? String(cue.startTime) : '';
  };
  media.addEventListener('timeupdate', followPlayback, { signal });
  media.addEventListener('loadedmetadata', populate, { signal });
  for (const track of media.querySelectorAll('track[kind="chapters"]'))
    track.addEventListener('load', populate, { signal });
  select.addEventListener(
    'change',
    () => {
      if (!select.value) return;
      const time = Number(select.value);
      if (Number.isFinite(time)) media.currentTime = time;
    },
    { signal },
  );
  populate();
}

function setupAudioCaptions(
  player: HTMLElement,
  media: HTMLMediaElement,
  signal: AbortSignal,
) {
  const output = player.querySelector<HTMLElement>('.alk-media-cues');
  if (!output) return;
  const update = () => {
    const cues = Array.from(media.textTracks)
      .filter(
        (track) =>
          track.mode === 'showing' &&
          ['captions', 'subtitles'].includes(track.kind),
      )
      .flatMap((track) => Array.from(track.activeCues ?? []));
    output.textContent = cues
      .map((cue) => (cue as VTTCue).getCueAsHTML().textContent)
      .join('\n');
    output.hidden = !output.textContent;
  };
  for (const track of Array.from(media.textTracks))
    track.addEventListener('cuechange', update, { signal });
  media.textTracks.addEventListener('change', update, { signal });
  update();
}

// Some embedded browsers advertise PiP but reject the request. Surface that failure
// on this player instead of leaving an unhandled rejection in the upstream handler.
function setupPictureInPicture(
  player: HTMLElement,
  media: HTMLMediaElement,
  signal: AbortSignal,
) {
  if (!(media instanceof HTMLVideoElement) || !media.requestPictureInPicture)
    return;
  player.addEventListener(
    'mediaenterpiprequest',
    (event) => {
      event.stopImmediatePropagation();
      void (async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          await media.requestPictureInPicture();
        } catch (cause) {
          const unsupported =
            cause instanceof DOMException &&
            ['NotSupportedError', 'SecurityError'].includes(cause.name);
          if (unsupported)
            player
              .querySelector<HTMLElement>('media-pip-button')
              ?.setAttribute('hidden', '');
          setStatus(
            player,
            unsupported
              ? 'Picture-in-picture is not available in this browser. Playback is still available here.'
              : 'Picture-in-picture could not start. Play the video first, then try again.',
            'error',
          );
        }
      })();
    },
    { capture: true, signal },
  );
}

/** Upgrade Astro output and dynamically inserted media specimens. */
export function initMediaPlayers(root: ParentNode = document): void {
  if (root instanceof HTMLElement && root.matches(PLAYER_SELECTOR))
    observePlayer(root);
  root.querySelectorAll<HTMLElement>(PLAYER_SELECTOR).forEach(observePlayer);
}

if (typeof document !== 'undefined') {
  if (!customElements.get('alk-media')) {
    customElements.define(
      'alk-media',
      class extends HTMLElement {
        connectedCallback() {
          observePlayer(this);
        }
        disconnectedCallback() {
          cleanups.get(this)?.();
          this.querySelector<HTMLMediaElement>('.alk-media-native')?.pause();
        }
      },
    );
  }
  document.addEventListener('astro:page-load', () => initMediaPlayers());
  if (document.readyState !== 'loading') initMediaPlayers();
  else
    document.addEventListener('DOMContentLoaded', () => initMediaPlayers(), {
      once: true,
    });
}
