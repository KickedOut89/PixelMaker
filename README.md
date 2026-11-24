# PixelMaker

A pixel art and sprite animation editor for Android phones, built for making
game sprites for Godot and Unity. It is a web app you install to your home
screen; once installed it works offline.

**Open it:** https://kickedout89.github.io/PixelMaker/

## Install on your phone

1. Open the link above in Chrome on Android.
2. Tap the ⋮ menu, then **Add to Home screen** (or **Install app**).
3. Launch PixelMaker from its icon. It runs full-screen and no longer needs a connection.

## What works today (stage 1: Draw)

- Pencil, eraser, fill and colour picker tools, brush sizes 1–8 (square or round)
- One finger draws; two fingers pan and pinch-zoom
- Two-finger tap = undo, three-finger tap = redo; hold a finger still to pick up a colour
- Palettes: PICO-8, DawnBringer 16/32, Endesga 32, Sweetie 16, Game Boy; edit, add and remove swatches
- Colour picker with hue, saturation/brightness, opacity and hex entry
- Sprites from 1×1 to 512×512, saved automatically on the device
- Export PNG at ×1, ×2, ×4 or ×8 (download, or share where the phone allows it)

Coming next: layers, frames and animation; sprite sheet, Godot, Unity and
`.aseprite` export; shapes, selections and symmetry. See
`docs/superpowers/specs/2026-11-24-pixelmaker-design.md`.

## Your sprites are stored in the browser

Sprites live in Chrome's storage for this site. Clearing Chrome's site data
for `kickedout89.github.io` deletes them, so export anything you care about.

## Turning on the hosted link (once)

In the GitHub repository: **Settings → Pages → Build and deployment → Source:
GitHub Actions**. After that, every push to `main` publishes the app.

## Development

```
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run e2e      # browser tests at phone size (builds first)
npm run build    # production build in dist/
```
