# Blackboard / whiteboard studies

Status: design studies for review, not a selected production theme.

The requested backgrounds are exactly `#111111` and `#eeeeee`. The board is the page, without a wood frame or fake classroom wall. All studies use the same copy, synthetic oscillator, and source sample so comparisons isolate the design.

| Study    | Typography                                                        | Layout                                                          | Signature                                                           |
| -------- | ----------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- |
| Seminar  | IBM Plex Serif, italic emphasis; Plex Sans body; Plex Mono labels | Broad editorial opening with a figure and marginalia            | A mathematical figure with restrained handwritten chalk notes       |
| Workshop | IBM Plex Sans, Caveat annotations; Plex Mono code                 | More compact introduction beside a working sketch               | A dry-erase underline, rounded marker strokes, and a small ink tray |
| Drafting | IBM Plex Mono headings and labels; Plex Sans body                 | Measured, gridded plate with aligned figure and reference cells | Crosshairs, coordinate rules, and an engineering drawing border     |

## Tokens

- Blackboard: board `#111111`, ink `#eeeeee`, muted `#aaa9a6`, rule `#393939`, cyan `#8cd9d0`, yellow `#ebd897`, rose `#e49bac`.
- Whiteboard: board `#eeeeee`, ink `#111111`, muted `#626262`, rule `#c5c5c5`, blue `#2259bb`, green `#267258`, red `#b34446`.
- Soft chalk roughness is limited to the SVG trace in Seminar. Body text stays crisp. Workshop adds marker strokes; Drafting uses exact lines. There is no surface texture overlay changing the requested background colors.
- Shared font families are self-hosted. Caveat is an OFL-licensed annotation face, scoped to the study.

## Review surface

`/design/boards/` offers three directions and two board surfaces. The URL preserves the selection for sharing. A damping slider changes an analytic oscillator, and the annotation control shows/hides figure notes. These interactions are study-local; they are not a released AlkChart API or a CSV demonstration.

The production theme remains unchanged until a direction is selected. The studio lives in the demo app; selected tokens and components will move into `@alkemist/ui` when the design is adopted.
