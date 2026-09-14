# Browser presentation standards: bounded native enhancements

**Decision:** treat browser presentation APIs as progressive, local enhancements
to the existing same-document Slides runtime. Keep the server-rendered reading
view and Reveal deck as the authority; model each optional capability as a
separately detectable session with explicit `unsupported`, `denied`, `active`,
`released`, and `closed` states. Do not present Document Picture-in-Picture,
Window Management, or Presentation API as a general second-display or casting
feature.

This report separates upstream evidence, design recommendations, and the implemented subset below. It was researched on **2026-09-14** against the local Slides
source and the linked primary specifications, vendor documentation, and MDN
Browser Compatibility Data (BCD) snapshot `483bb6cb636577da00fc0e3ed46372c88778d0cf`.
The BCD version entries below are support _floors_, not a substitute for runtime
feature detection, policy checks, user settings, or an exercised device.

## Implementation decisions

The local implementation is in `slides-native.ts`, `presentation-session.ts`, and the standalone `Annotations` component. Wake lock, attached-display selection, floating notes, a synchronized audience window, and an opt-in Presentation API adapter are wired into Slides. The existing Reveal speaker window remains available.

- Audience state contains only version/session/revision, slide, fragment and blackout. A random per-opening session scopes BroadcastChannel; direct linked-window messages additionally validate origin and source and provide a fallback if channel construction is denied. This is same-browser synchronization, not a phone remote or account service.
- Floating notes are a small purpose-built document with local callbacks; no arbitrary incoming command messages or live widget DOM are accepted. They may remain usable while the opener is hidden so a presenter can control an audience window. The opener's hidden media, widgets, timer and wake lock remain suspended. Read, pagehide and disconnect close the floating window. This deliberately narrows the proposed hidden-page cleanup contract below to expensive activity rather than the notes projection itself.
- Display permission can be requested first, then a fresh chooser click supplies activation for fullscreen. Late grants are ignored after lifecycle changes; topology changes refresh the open list.
- The shipped annotation profile uses a source URL, UUID URN, plain-text body, TextQuoteSelector and TextPositionSelector. It does not implement revision pinning, a server, FragmentSelector/Choice, or drawing. Quote context helps re-anchor moved text; ambiguous and missing anchors are explicit. The richer selector/revision design below is a future extension, not a release claim.
- Cast navigation reconstructs the authored deck on a receiver; arbitrary widget interaction state and local annotations are not mirrored. Casting is off by default. A compatible physical receiver has not been tested.

## Local evidence and boundary

The current `Slides` component has one server-rendered slide tree. Its client
runtime lazy-loads Reveal, keeps widget DOM instances mounted while toggling
read/present mode, signals widget activity with `alk:presentation`, uses native
modal `dialog`s for Overview and help, and pauses activity on visibility changes.
It also destroys/rebuilds Reveal around `pagehide`/BFCache `pageshow` and accepts
only a small JSON Reveal protocol from the same-origin, parent speaker window.
See [slides-client.ts](../packages/components/src/slides-client.ts) and
[slides.astro](../packages/components/src/slides.astro). The documentation
currently says drawing and saved ink are unimplemented in
[slides-and-annotations.md](slides-and-annotations.md).

That makes these invariant boundaries important:

1. The authored deck, current Reveal indices/fragment, and widget instances are
   authoritative in the opener document. A remote view receives a projection and
   command protocol; it does not acquire a second independent deck state.
2. An enhancement must always return to the readable/present deck after a
   capability denial, receiver loss, external-display change, PiP close, or
   page restore. It must not turn a temporary remote surface into a requirement
   for controlling the presentation.
3. Never clone arbitrary live widget DOM as a way to make a second view. Moving
   a node to another document changes its owner document and can violate a
   widget's assumptions. For a bounded presenter view, render a small purpose-
   built projection (current/upcoming title, notes, clock, static figure poster)
   and synchronize serializable state.

## Decision matrix

| Need                                                  | Standard facility                                                         | Current compatibility evidence                                                                       | Recommendation                                                                                                            | Hard boundary                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep an active talk display awake                     | Screen Wake Lock                                                          | BCD: Chrome 84, Firefox 126, Safari 16.4; iOS Safari 18.4, with 16.4–18.3 partial                    | Offer an opt-in `Keep display awake` toggle while local presentation is active and visible                                | The OS/browser may deny or release it; it is never an assurance that a screen stays on                                                             |
| Fullscreen the existing deck                          | Fullscreen API                                                            | Existing component already uses it; broadly implemented                                              | Keep current control and error fallback                                                                                   | User activation and a `fullscreen` Permissions Policy still govern it                                                                              |
| Choose a known attached display for fullscreen        | Window Management + Fullscreen `screen` option                            | BCD: `getScreenDetails` Chrome 100; Firefox/Safari `false`                                           | Chromium-only enhancement behind a dedicated, clicked `Present on display…` command                                       | Permission/policy and screen topology can change; no universal multi-screen behavior                                                               |
| Floating controls/notes above other apps              | Document Picture-in-Picture                                               | BCD: Chrome 116, Firefox 151, Safari `false`; Chrome Android `false`                                 | Experimental desktop enhancement for a narrow controller/projection                                                       | It is not fullscreen, not positionable, not navigable, only from the top-level opener, and must close with it                                      |
| Local speaker-window or same-origin preview sync      | `postMessage` / `MessageChannel`; BroadcastChannel only where appropriate | `postMessage` is universal; BroadcastChannel BCD: Chrome 54, Firefox 38, Safari 15.4                 | Keep direct-window `postMessage` as the default; use an optional per-session `MessageChannel` after a validated handshake | Never use wildcard target origins or accept unvalidated source/origin/schema; BroadcastChannel is partition-scoped fan-out, not a pairing protocol |
| Cast a URL to a receiver selected by the user agent   | Presentation API                                                          | BCD: Chrome 47 / Edge mirror; Firefox and Safari `false`; Android WebView `false`                    | Keep as a separately documented experimental adapter, disabled by default                                                 | A supported controller API does not establish available hardware, a compatible receiver, or cross-device success                                   |
| Add text annotations without changing authored markup | Selection/Range + CSS Custom Highlight                                    | Highlight BCD: Chrome 105, Safari 17.2, Firefox 140; `::highlight()` BCD still lists Firefox `false` | Use a transient visual layer when the full API is present; otherwise render an accessible annotation list/mark fallback   | `Range` objects are live DOM positions and are not durable selectors                                                                               |
| Persist/re-anchor annotations across edits            | W3C Web Annotation selectors                                              | Data Model is W3C REC, 2017-02-23                                                                    | Store versioned JSON-LD targets with quote plus position/context; resolve and report ambiguity                            | Selectors are re-anchoring evidence, not immutable identity or proof of exact historical text                                                      |
| Overview/help/compact tool menus                      | Native `dialog` and Popover                                               | Dialog BCD: Chrome 37, Firefox 98, Safari 15.4. Popover: Chrome 114, Firefox 125, Safari 17          | Retain `dialog` for modal task completion; use `popover` for non-modal Tools where the existing fallback is retained      | A modal dialog makes the rest of the document inert and lives in the top layer; it cannot be fullscreened                                          |

## Capability contracts

### Screen Wake Lock

The W3C Screen Wake Lock Working Draft (2024-10-24) defines a `screen` lock that
prevents the display from turning off under applicable, allowed conditions. It
automatically releases active screen locks when the document becomes hidden and
when the document is discarded. A `WakeLockSentinel` can also release for
implementation-specific reasons, so the `release` event is a state transition,
not merely telemetry. [W3C spec](https://www.w3.org/TR/screen-wake-lock/)
[MDN guide](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
(accessed 2026-09-14).

Implementation contract:

- Detect `navigator.wakeLock?.request`; require a secure context. Request only
  from an explicit control or an already chosen presentation preference, never
  automatically on page load.
- Retain one sentinel per Slides instance. On `release`, clear the reference and
  accurately show `released`; on leaving presentation, blackout, `pagehide`,
  disconnect, or an explicit toggle-off, call `release()` if it is still held.
- On `visibilitychange` back to `visible`, reacquire only if the user opted in,
  the deck is still presenting, and the prior lock was released. Catch
  `NotAllowedError` and implementation/system failures without retry loops.
- Respect `Permissions-Policy: screen-wake-lock`; its default allowlist is
  `self`. A cross-origin embed needs both an allowed response policy and
  `allow="screen-wake-lock"` on the iframe. The user or platform may still deny
  a request.

Validation contract: test acquire/release UI and sentinel state, hide/show,
read-mode exit, explicit release, denied policy in an iframe, and BFCache
restore. Device sleep prevention itself needs an observed physical-device test;
passing browser automation cannot establish it.

### Fullscreen and Window Management

The Fullscreen API requires transient user activation. It rejects when policy or
eligibility disallows it; `fullscreenchange` (and error handling) is authoritative
because the user or browser can leave fullscreen. A `<dialog>` is not an eligible
fullscreen element. [Fullscreen method](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen)
(accessed 2026-09-14).

The Window Management API is a W3C Working Draft dated **2026-09-08**. It adds
`window.getScreenDetails()`, `screen.isExtended`, screen-topology events, and a
`screen` option for `requestFullscreen()`. It is a policy-controlled
`window-management` feature; a third-party embed needs `allow="window-management"`
as well as an allowing policy. [W3C Window Management](https://www.w3.org/TR/window-management/)
[MDN usage](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API/Using)
(accessed 2026-09-14).

The activation sequence is unusually important. `getScreenDetails()` is itself
permission/user-activation gated. The specification records a target-screen
fullscreen time when it consumes activation and narrowly waives the subsequent
fullscreen activation requirement for the transient-activation duration. One
valid compact flow is a single click handler that immediately does:

1. feature/policy check;
2. `const details = await window.getScreenDetails()`;
3. choose a still-present `ScreenDetailed` from `details.screens`;
4. `await slides.requestFullscreen({ screen: chosen })`;
5. attach `screenschange`/`currentscreenchange` listeners and fall back to
   ordinary local fullscreen if the requested screen has disappeared or the
   promise rejects.

An explicit two-step flow is also valid: use a clicked permission/discovery
control to obtain details and render a chooser, then invoke
`requestFullscreen({ screen })` from the user’s later explicit chooser-button
click. That later click supplies fresh transient activation, independent of the
first flow’s waiver. Refresh the chooser and selected `ScreenDetailed` whenever
`screenschange` fires; if topology changes between selection and the second
click, require selection again. Do not reuse a screen object that is no longer
in `details.screens`. Treat labels, geometry, and `isPrimary` as sensitive
runtime data and keep it in memory only for the active session. The BCD snapshot
lists Chrome 100 (and Chromium mirrors) for `getScreenDetails`, with Firefox and
Safari absent; this must remain a runtime enhancement.

Validation contract: Chromium desktop tests for denial, one screen,
two screens, display unplug between chooser and request, manually leaving
fullscreen, and cross-origin embed policy. A test that merely stubs a
`ScreenDetails` object proves control flow, not external-display placement.

### Document Picture-in-Picture

Document Picture-in-Picture (Document PiP) is a WICG Community Group draft,
dated **2026-02-04**, rather than a W3C Recommendation. It opens an always-on-top
same-origin document associated with a top-level opener. It requires a secure
context and transient activation, is unavailable to nested frames, cannot be
navigated or independently outlive the opener, and the user agent must disable
fullscreen and scripted positioning in the PiP window. [Document PiP spec](https://wicg.github.io/document-picture-in-picture/)
[MDN requestWindow reference](https://developer.mozilla.org/en-US/docs/Web/API/DocumentPictureInPicture/requestWindow)
(accessed 2026-09-14).

Therefore it is suitable only for a **small floating controller/projection**:
notes, current slide title, next title, elapsed clock, and next/previous/blackout
commands. It is unsuitable as a full deck presentation surface, a second-screen
fullscreen surrogate, or a way to preserve arbitrary interactive widgets.

Implementation contract:

- Detect `window.documentPictureInPicture?.requestWindow`; expose the command
  only in a top-level secure document and call it directly from its button
  handler. Handle `NotAllowedError`, `RangeError`, policy/settings disablement,
  and no activation as visible `unavailable`/`denied` states.
- A single Slides session owns `pipWindow`. Opening another controller must
  focus/reuse the existing window or close it before requesting a replacement;
  OS/browser PiP concurrency is intentionally not portable.
- Copy only required stylesheets or construct a narrow stylesheet in the PiP
  document. Render a dedicated static DOM projection there. Do not move the
  Reveal viewport, media elements, canvas, WebGL, MIDI, chart, model, shader,
  or annotation DOM into it.
- Use a same-origin `MessageChannel` handshake for commands and state snapshots;
  remove listeners and close the port when the PiP window emits `pagehide`, the
  opener unloads, or the deck leaves present mode. Restore focus to the
  opener's visible Slides control.
- Its visibility does not make the opener visible. Keep current opener
  `visibilitychange` activity cleanup; do not use the PiP window to keep media
  or wake locks running in a hidden opener.

The current BCD snapshot reports Chrome 116, Firefox 151, and Safari `false`
for the interface. `firefox: 151` is BCD’s recorded version floor; it is not
evidence that Alkemist has exercised that Firefox release or that the API is
enabled in every channel/configuration. `edge: mirror` and `safari_ios: mirror`
mean BCD inherits the corresponding Chrome/Safari entry rather than reporting a
separate validation. No implementation claim should be made until the real
target browser is exercised.

### Session transport: `postMessage`, `MessageChannel`, BroadcastChannel

Direct linked windows (the existing Reveal speaker window or a Document PiP
window) should use `postMessage` with a literal target origin and receive-side
validation of all three: `event.origin === location.origin`, expected
`event.source`, and a small versioned data schema. The HTML Living Standard
explicitly treats cross-document messaging as a security-sensitive capability;
never use `"*"` for a target origin where the recipient origin is known.
[HTML Web Messaging](https://html.spec.whatwg.org/multipage/web-messaging.html)
[MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
(accessed 2026-09-14).

After the validated ready message, transfer a `MessagePort` to obtain a
per-session, bidirectional channel. Include `{ protocol: 1, sessionId, seq,
kind }`; accept commands only for the current session and reject malformed,
unknown, stale, or out-of-order input. Snapshot state after receiver ready and
after `pageshow`; coalesce high-frequency pointer/timer updates. This preserves
the existing narrow Reveal receiver boundary rather than creating a general page
message bus.

`BroadcastChannel` is appropriate only for optional same-site fan-out—such as
two independently opened local control pages that explicitly join the same deck
session—and should still carry the same random session id/schema. It reaches
browsing contexts and workers of the same origin **and storage partition**.
An iframe at `b.example` embedded under `a.example` cannot use a channel to talk
to a top-level `b.example` page; privacy settings can also make construction
throw `SecurityError`. It is not a cross-origin transport and has no pairing,
delivery acknowledgement, or retained state. [MDN Broadcast Channel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
[MDN storage policy](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Storage_Access_Policy)
(accessed 2026-09-14).

Close a BroadcastChannel and MessagePorts in `pagehide`/component disconnect;
on BFCache `pageshow.persisted`, construct/rejoin and request a snapshot. This
avoids treating a frozen page as a live controller.

### Presentation API

The W3C Presentation API Candidate Recommendation Draft is dated **2025-02-12**.
It defines a controller `PresentationRequest` and a receiver context exposed as
`navigator.presentation.receiver`; the receiver may be in the same user agent
or a different user agent. The API is secure-context exposed. [Presentation API](https://www.w3.org/TR/presentation-api/)
(accessed 2026-09-14).

This standard only defines the browser-facing controller/receiver contract. It
does not guarantee that a given browser discovers a television/projector,
supports a transport, can load the receiver URL, has user permission, or has
tested hardware. BCD currently lists Chrome 47 and Edge mirror, while Firefox
and Safari are `false` and Android WebView is `false`. Accordingly:

- keep casting behind an explicit experimental `Present on receiver…` adapter;
- construct `PresentationRequest` with an absolute, same-origin, receiver-safe
  deck URL containing only a random session token—not a bearer credential or
  annotation content;
- invoke `start()` from user activation and surface request/connection rejection
  as `receiver unavailable`; wait for `connectionavailable` or the returned
  connection, then use its lifecycle events and send an initial state snapshot;
- receiver code uses only `navigator.presentation.receiver` and its
  `connectionavailable` event; it must remain readable and show a local
  unavailable state if loaded normally;
- terminate/close on deck exit, `pagehide`, receiver termination, or transport
  close; permit reconnect only to the current session and re-send a snapshot.

The existing `?receiver` Reveal speaker protocol is a same-origin browser-window
protocol; it is not a Presentation API receiver and should not be advertised as
casting. Any actual receiver validation requires a real supported controller,
receiver route, and external receiver path; no such hardware evidence exists in
this repository.

## Annotations: native selection, visual range, durable target

The Selection API’s current W3C Working Draft is dated **2026-06-09** and says
a selection is associated with a single range. Obtain a selection from the deck
viewport, reject collapsed/out-of-viewport ranges, and immediately
`cloneRange()` before opening annotation UI. The selection can change with focus,
navigation, or browser behavior. Programmatic selection focus effects differ
across engines, so avoid modifying the user’s selection merely to show an
annotation. [Selection API](https://www.w3.org/TR/selection-api/)
[MDN Selection](https://developer.mozilla.org/en-US/docs/Web/API/Selection)
(accessed 2026-09-14).

CSS Custom Highlight is the right non-mutating paint layer for an attached,
currently resolved `Range`: create `new Highlight(range)`, register a
namespaced key in `CSS.highlights`, style `::highlight(key)`, then delete the
key on annotation removal, slide deactivation, rerender, or disconnect. It does
not serialize, survive a DOM rebuild, create semantic markup, or supply an
accessible annotation body by itself. [CSS Highlight API Level 1](https://www.w3.org/TR/css-highlight-api-1/)
[MDN custom highlights](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
(accessed 2026-09-14).

Use a feature check for all three pieces (`CSS.highlights`, `Highlight`, and
`CSS.supports('selector(::highlight(alk-annotation))')`), since current BCD
lists `HighlightRegistry` in Firefox 140 but `::highlight()` support as `false`.
When unavailable, provide a visible, keyboard-accessible annotation list linked
to the slide and a non-mutating `mark`/outline fallback only where rendering a
resolved target is safe. Do not promise identical visual placement.

For storage, use the W3C Web Annotation Data Model Recommendation, dated
**2017-02-23**, as an interchange shape. An annotation target should be a
`SpecificResource` whose `source` is a canonical deck revision URL and whose
selector is a `Choice` ordered by durability:

1. a component-authored stable fragment/slide id (`FragmentSelector`) where
   available;
2. `TextQuoteSelector` with `exact`, normalized `prefix`, and normalized
   `suffix`;
3. `TextPositionSelector` with offsets in a declared normalized text stream;
4. optional `RangeSelector`/CSS selector only as a fast local hint, never the
   sole durable anchor.

Persist target `source` plus content/revision identifier, slide id, selector
normalization algorithm version, creator/time, motivation, and textual body.
On resolution, first require the revision match; otherwise match the quote and
context, use position as a tie-breaker, and classify the result as `exact`,
`ambiguous`, or `orphaned`. Never silently attach an ambiguous note to the first
matching text. The model lists Fragment, CSS, XPath, Text Quote, Text Position,
and Range selectors but does not prescribe this resolver algorithm. [Web
Annotation Data Model](https://www.w3.org/TR/annotation-model/).

Validation contract: select across inline nodes, select in a code block, reject
across slides/interactive controls, navigate away/back, change a matching quote
in one place (ambiguous), delete it (orphan), and render with/without Custom
Highlight support. Screen-reader output must expose the annotation list/body;
paint alone is insufficient evidence of accessible annotation.

## Popover, dialog, top layer, and lifecycle

Native `<dialog>` is broadly usable according to BCD (Chrome 37, Firefox 98,
Safari 15.4). `showModal()` moves it to the top layer and makes the rest of the
document inert; `cancel` and `close` are required state transitions for timer,
focus, and activity cleanup. The current Overview/help implementation correctly
records the invoking control and restores focus after close. Keep `dialog` for
modal tasks that must suspend the deck. [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
(accessed 2026-09-14).

The Popover API is a better fit for a non-modal Tools menu or transient
annotation editor: `popover="auto"`, an explicit `popovertarget`, light-dismiss,
and `beforetoggle`/`toggle` to synchronize UI state. BCD floors are Chrome 114,
Firefox 125, and Safari 17. Retain the existing `<details>` structure as the
fallback; a popover is in the top layer and is not a replacement for a modal
dialog. [MDN Popover](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
(accessed 2026-09-14).

For every optional session, use the same lifecycle table:

| Event                                       | Required action                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `visibilitychange` to hidden                | Pause timers/media/widget activity; release Wake Lock is automatic but clear sentinel state; allow only explicit floating-note navigation; do not reactivate hidden widgets or media |
| `pagehide`                                  | Stop timer, close/release local session resources and ports, persist only serializable presentation/annotation state; do not use `unload`                                            |
| `pageshow` with `persisted`                 | Rebuild the Reveal binding if needed, reattach listeners/channels, reconcile current state, and reacquire Wake Lock only on an existing user preference and visible presentation     |
| `fullscreenchange`                          | Update label and layout from actual state; do not infer success from the request call                                                                                                |
| PiP/receiver close or transport termination | Clear handle, update UI, retain the local deck and its current slide                                                                                                                 |
| component disconnect                        | Abort listeners/observers, release locks, close ports/channels/windows owned by the component, and preserve no live remote command path                                              |

`pagehide`/`pageshow.persisted` are the portable BFCache signals. The browser can
freeze a page rather than unload it, so reconstruct communications rather than
assuming stale window references or channels are live. [web.dev BFCache](https://web.dev/articles/bfcache)
[MDN pageshow](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event)
(accessed 2026-09-14).

## Recommended bounded architecture

Introduce a Slides-internal `PresentationSession` owner only when implementing
one of these enhancements. It receives immutable serializable snapshots from the
existing deck (`slide`, `fragment`, titles, notes, timer state, blackout state),
accepts a small command union (`prev`, `next`, `goto`, `blackout`, `close`), and
returns a discriminated status union. It owns no Reveal instance and no widget
DOM. Its adapters are:

- `LocalFullscreenSession`: current Fullscreen behavior, optionally with a
  transient Window-Management target screen;
- `WakeLockSession`: opt-in sentinel, visibility recovery, release listener;
- `WindowProjectionSession`: existing speaker window or Document PiP projection,
  with validated `MessageChannel` transport;
- `PresentationReceiverSession`: separately experimental Presentation API
  adapter, with an explicit receiver page and no hardware-success claim;
- `AnnotationSession`: selector serialization/re-resolution and optional CSS
  highlight registry; its accessible list is independent of paint support.

Feature-detect before constructing an adapter and make unsupported controls
absent or clearly disabled with a brief reason. Do not bundle permission prompts:
Window Management/fullscreen, PiP, wake lock, and Presentation start should each
have a user-intentful control. In particular, do not ask for a Wake Lock merely
because the user chose PiP or a second display.

## Evidence limitations

The compatibility entries come from the MDN BCD GitHub `main` snapshot named
above, accessed **2026-09-14**. A BCD `mirror` entry inherits another browser’s
support statement and is not separate browser testing. A version floor records
BCD metadata, not the local installed/browser-channel state. In particular, the
same snapshot records Wake Lock on iOS Safari as 18.4, with 16.4–18.3 a partial
implementation that does not work in standalone Home Screen web apps; it does
not say iOS Safari is universally unsupported. The entries establish
vendor-reported version metadata, not policy configuration, receiver discovery,
display placement, operating system behavior, a physical cast route,
accessibility quality, or widget preservation. The specs define API contracts;
they do not prove an external projector, television, browser channel, or
hardware receiver was used. Those claims require targeted browser/device
evidence at implementation time.
