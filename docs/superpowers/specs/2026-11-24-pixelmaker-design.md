# PixelMaker — design

Date: 2026-11-24

## Intent

A pixel art and animated sprite editor that runs on an Android phone, for
making game sprites that go into Godot or Unity. It borrows the proven
feature set of Aseprite, LibreSprite, Pixelorama and Piskel, but is laid out
for a touchscreen held in portrait, not for a mouse and keyboard.

The owner said: Android phone; pixel art tool and animated sprite editor;
modelled on those four programs (and others worth looking at); the sprites
are for Godot or Unity; build it as an installable web app now and wrap it
as an APK later. Everything else below is a proposal made on their behalf.

## Goals

- Draw and animate a game sprite start to finish on a phone, comfortably,
  with a finger (stylus works too but is not required).
- Get the result into Godot or Unity without a desktop step and without
  owning Aseprite (see "Getting into the engine").
- Round-trip with desktop Aseprite / LibreSprite / Pixelorama through
  `.aseprite` files.
- Never lose work: continuous autosave, deep undo.
- Works offline once installed.

## Non-goals

- Desktop-first layout, keyboard shortcut system, scripting/extensions.
- Accounts, cloud sync, collaboration, online galleries.
- Large-canvas painting (photo editing, soft brushes, anti-aliased tools).
- Play Store release (the later APK wrap is a separate project).

## Anti-goals

- A desktop UI shrunk onto a phone: tiny hit targets, nested menus, panels
  that cover the canvas.
- Finger occluding the pixel being drawn with no way around it.
- Exports that need hand-fixing before an engine will import them.
- Any blurry/smoothed rendering of pixels, at any zoom.

## Constraints

- Build environment has Node, Java, Gradle; no Android SDK. Everything must
  be buildable and testable in a headless Chromium at phone size.
- Hosting: GitHub Pages from `KickedOut89/PixelMaker` (static files only,
  served under the `/PixelMaker/` path). The owner must switch Pages on in
  the repo settings once.
- Target browser: current Chrome on Android. No support work for others.
- Files leave the app via download / Android share sheet, and come in via
  the file picker. No direct folder access until the APK wrap.
- Must not paint itself into a corner for the wrap: no server, no
  dependence on being served from a particular origin.

## Approaches considered

1. **Installable web app (PWA), TypeScript + canvas, on GitHub Pages** —
   chosen. Testable here in a phone-sized browser; installs from a link;
   offline. Cost: file access through share/download only.
2. **Native Android (Kotlin).** Best file and stylus integration, but it
   can't be run or seen in the build environment; the owner would be the
   only tester of sideloaded APKs.
3. **Approach 1 now, wrapped as an APK later** (Capacitor or similar) —
   chosen as the follow-on. Adds real file access without discarding work.

Dropped: forking Pixelorama (runs on Android, but its desktop layout would
need more rework than a touch-first start).

The owner picked 1, with 3 later.

## What it does

### Document model

A sprite is: canvas size, a palette, an ordered stack of layers, an ordered
list of frames (each with its own duration in ms), a set of animation tags,
and cels (the image at one layer × one frame). This is Aseprite's model and
is what makes `.aseprite` round-tripping straightforward.

- Colour mode: RGBA only in v1. The palette is a set of swatches, not an
  index table. (Indexed mode is in "later".)
- Layers: name, visible, locked, opacity, blend mode (normal only in v1).
  Add, delete, duplicate, reorder, merge down.
- Frames: add, delete, duplicate, reorder, per-frame duration.
- Tags: name, colour, from-frame, to-frame, direction (forward, reverse,
  ping-pong). These become the engine's animation names.
- Canvas: any size from 1×1 to 512×512; new-sprite presets 16, 32, 48, 64,
  128. Resize canvas (with anchor), scale sprite (nearest neighbour), crop
  to selection, flip and rotate 90° for canvas and for selection.

### Drawing tools (v1)

Pencil (1–8 px square/round brush, with pixel-perfect mode that removes
L-shaped corners), eraser, bucket fill (contiguous / global), eyedropper,
line, rectangle and ellipse (outline / filled), rectangular selection and
magic wand, move (selection contents or whole cel), and symmetry (vertical,
horizontal, both) that applies to all drawing tools.

Selection supports cut, copy, paste, delete, flip, and nudge-by-drag.

### Touch behaviour

- One finger draws. Two fingers pan and pinch-zoom, and a two-finger
  gesture never leaves a stray mark from the first finger landing.
- Two-finger tap = undo, three-finger tap = redo (as in Procreate and
  several mobile pixel apps), plus on-screen undo/redo buttons.
- Long-press on the canvas = temporary eyedropper.
- **Cursor mode** (toggle): the finger moves a crosshair offset from the
  touch point and a large on-screen button "presses" the tool, so the pixel
  being drawn is never under the finger. This is the answer to finger
  occlusion and is on equal footing with direct drawing, not an
  afterthought.
- Zoom snaps to whole-number multiples when it settles; a pixel grid
  appears above 8×. "Fit" button recentres.
- All controls are at least 44 px; the canvas keeps the largest share of
  the screen in portrait. Landscape works but portrait is designed first.

### Screen layout (portrait)

```
┌──────────────────────────────┐
│ ☰  hero_run   ↶ ↷   ▶  ⋯    │  top bar: menu, name, undo/redo, play, more
├──────────────────────────────┤
│                              │
│                              │
│           canvas             │
│      (checkerboard bg)       │
│                              │
│                              │
├──────────────────────────────┤
│ ■■ ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪  +     │  colour: fg/bg + palette strip
├──────────────────────────────┤
│ ✎ ◻ ▨ ⌖ ╱ ▭ ◯ ⬚ ✥ ⇋         │  tool row (tap again for options)
├──────────────────────────────┤
│ L2 ▣ ▣ ▣ ▢ ▢   [idle][run ]  │  timeline: layers × frames, tags,
│ L1 ▣ ▣ ▣ ▣ ▣       +         │  collapsible to a one-line frame strip
└──────────────────────────────┘
```

Tapping the selected tool again opens a small options sheet (brush size,
filled, pixel-perfect, tolerance). Colour picker, layer properties, tag
editor and export open as bottom sheets, never full-screen takeovers,
except the file gallery.

### Colour

Foreground / background colours with swap. Picker with HSV square + hue
slider, hex entry, alpha. Palette strip: tap to select, long-press to
edit/delete, add current colour. Bundled palettes (at least: PICO-8,
DawnBringer 16 and 32, Endesga 32, Sweetie 16, Game Boy). Import palette
from `.gpl`, `.hex`, or a PNG; export `.gpl`. "Palette from sprite" builds
swatches from colours in use.

### Animation

Timeline grid of layers × frames with tag bars above it. Playback in the
editor at real frame durations, looping the whole sprite or the tag under
the playhead, honouring tag direction. Onion skin: previous/next frames
(1–3 each side), tinted, adjustable opacity. A small floating preview
window shows the animation playing at 1× / 2× while you draw.

### Files, saving, export

- **Autosave** every change to on-device storage (IndexedDB). A gallery
  screen lists sprites with thumbnails; rename, duplicate, delete.
  Undo history is per session, at least 100 steps.
- **Open:** `.aseprite` / `.ase`, PNG (as a single frame, or sliced as a
  sprite sheet by cell size), GIF (frames + durations).
- **Save as:** `.aseprite` (the app's interchange format; there is no
  separate native file format).
- **Export:**
  - Sprite sheet PNG: horizontal strip, vertical strip, grid with chosen
    columns, or one row per tag; optional padding/spacing, optional trim;
    scale ×1–×8.
  - JSON data alongside it in Aseprite's `--data` format (both "hash" and
    "array" forms), including `frameTags` and per-frame `duration`. A
    generic format many tools and engine plugins read.
  - Godot 4 `SpriteFrames` resource (`.tres`) referencing the sheet PNG,
    one animation per tag with per-frame durations and loop flag.
  - Animated GIF (whole sprite or one tag, with scale).
  - Single frame PNG, and a zip of PNG frames.
  - "Download" (to the phone's Downloads folder) works for every export
    and is the baseline. "Share" is offered in addition only for types
    Chrome will share from a web app (PNG, GIF). Multi-file exports
    (sheet + JSON, sheet + `.tres`) can be downloaded as loose files or as
    one zip.
- **Backup:** "Back up all sprites" downloads one zip of every sprite as
  `.aseprite`; "Restore" reads it back. The app also asks the browser for
  persistent storage. This protects against cleared site data and is the
  route for moving work into the later APK.
- `.aseprite` features the app doesn't model (indexed/greyscale mode,
  tilemap layers, slices, user data, non-normal blend modes, linked cels,
  group layers) are handled on open by converting to what the app does
  model (flatten to RGBA, treat groups as flat layers, unlink cels) and the
  user is told what was converted. They are not preserved on save.

### Getting into the engine

(Builder's call after review; the owner said "Godot, or Unity", so both are
served.)

- **Unity:** Unity's official Aseprite Importer package reads `.aseprite`
  files directly and builds sprites and animation clips from tags. So the
  Unity path is "Save as `.aseprite`, drop into Assets". This makes the
  `.aseprite` writer the critical piece of stage 3: layers, frames,
  durations, tags and cels must be written exactly to spec.
- **Godot:** the popular Aseprite plugins shell out to the Aseprite
  program, which the owner may not have. So the Godot path is the
  `SpriteFrames` `.tres` + sheet PNG export, which `AnimatedSprite2D` uses
  with no plugin.
- **Anything else:** sheet PNG + Aseprite-format JSON.

These claims about importer behaviour are to be verified against current
Unity and Godot documentation at the start of stage 3, before building.

### Installable and offline

Web app manifest, icons, service worker caching the app shell so it opens
with no network. Display mode standalone, portrait-preferred, with the
system gesture areas respected so edge swipes don't close the app
mid-stroke.

## Delivery order

The work is one project delivered in stages, each usable on its own:

1. **Draw:** project scaffold, document model, canvas with pan/zoom, pencil,
   eraser, fill, eyedropper, colour + palette strip, undo/redo, autosave,
   PNG export, installable + offline, deployed to Pages.
2. **Animate:** layers, frames, timeline, playback, onion skin, tags,
   preview window, gallery.
3. **Ship to an engine:** `.aseprite` open/save, sprite sheet + JSON
   export, Godot `SpriteFrames` export, GIF export, PNG/GIF/sheet import,
   backup/restore.
4. **Finish the toolbox:** shapes, selection tools and transforms, symmetry,
   pixel-perfect, cursor mode, palette import/export, canvas resize/scale.

Cursor mode sits in stage 4 only because it depends on the full tool set;
if finger occlusion makes stage 1 unpleasant in testing, pull it forward.

## How it gets checked

- Automated: unit tests on the core; Playwright at a phone viewport with
  touch emulation for the UI.
- `.aseprite` reading is tested against a small set of real files made by
  Aseprite (openly licensed samples, checked into the repo as fixtures);
  writing is tested by round-trip through the reader and by byte-level
  checks against the spec. No Aseprite, Godot or Unity runs in the build
  environment.
- The owner tries each stage on their phone when it is deployed and
  reports how the touch handling feels; gesture thresholds are kept in one
  place so they are cheap to tune. The owner also does the first real
  import into Godot / Unity at the end of stage 3.

## Later (explicitly not in this build)

Indexed colour mode and palette-swap, blend modes, group layers, linked
cels, tilemap layers and tilesets, slices / 9-patch, dithering and shading
ink modes, gradient tool, text tool, outline / replace-colour / HSV-adjust
effects, reference image layer, custom brushes, tiled-wrap preview, APK wrap with direct folder access.

## Builder's calls (already made, change if there's a reason)

- TypeScript, Vite. UI chrome in Preact; the canvas is drawn by hand.
- The document model and all pixel operations live in a UI-free core
  module, unit-tested with Vitest. Tools are pure functions over that core.
- Pixels are stored as `Uint8ClampedArray` RGBA per cel; compositing to an
  offscreen canvas at 1:1, then scaled to screen with smoothing off.
- Undo stores per-cel before/after patches for the dirty rectangle, plus
  structural commands for layer/frame/tag operations.
- Input via Pointer Events with `touch-action: none`; a short delay or
  stroke-rollback distinguishes one-finger draw from two-finger gestures.
- `.aseprite` reader/writer written in-repo against Aseprite's published
  file spec (zlib via `fflate`); GIF encode/decode via a small library or
  in-repo; zip via `fflate`.
- End-to-end checks with Playwright at a phone viewport with touch
  emulation.
- Deploy with a GitHub Actions workflow to Pages on push to the default
  branch.

## Left to the builder

Visual styling (dark theme, restrained; pixel-art apps look right dark),
icon set, exact sheet/gesture animations, internal file layout, exact undo
depth and autosave debounce, GIF library choice, how tool options are
grouped.
