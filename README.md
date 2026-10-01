# Procedural Animation Editor

A mobile-friendly 2D animation editor built with JavaScript, React, and HTML Canvas. Draw shapes or smoothed brush strokes, edit sparse keyframes, nest reusable symbols, and export full-HD movies.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
npm start
```

## Editing

- Draw straight lines, Bézier curves, brush strokes, freeform pen shapes, circles, and rectangles.
- Use the Freeform pen (P) and finish within 18 screen pixels of the start to close an outline. After drawing, adjust the floating Smoothness slider above the tools to smooth the outline and reduce its control points. Lowering it restores detail from the original stroke. The slider overlays the canvas without resizing it. It stays dismissed after deselecting the shape. Drag or box-select control points to reshape and animate the finished outline. Closed outlines support fill and stroke styles.
- Select, box-select control points, and move, scale, or rotate selections.
- Turn grid and shape snapping on or off; pinch to zoom. The page stays fixed while tool strips and dialogs can scroll. Frame strips in editing and recording support momentum and elastic edge bounce; adding or copying a frame reveals the rightmost Add frame button.
- Main-timeline pan and zoom edits become camera keyframes. Tap the selected frame again and choose Camera to edit X, Y, and zoom numerically. Camera properties inherit until changed and animate with frame timing/easing in playback, movies, and recording transitions. Symbol editing keeps an independent navigation view.
- Edit colors, styles, layer order, locks, and symbol tint from the selection menu.
- Copy shapes normally or make linked symbol copies; unlink from inside a shared symbol.
- Add, copy, delete, and reorder frames. Frame timing supports fractional and longer multiples of the timeline speed. Playback jumps from the final frame to the first without holding.
- Tap empty canvas space for Paste and Import. Import photos/images or saved animation JSON files. Imported animations become independent editable symbols; use Load to replace the whole project instead.

## Images and saving

Photos are resized to at most 1600 pixels on their longest side and embedded as image data in the project. Images move, resize, rotate, copy, animate, and render inside symbols and movies. Native photo/file pickers depend on the device and browser; unsupported image formats produce a message.

Projects automatically save to IndexedDB on this device, with safe migration from earlier localStorage saves. Each distinct image is stored once per saved project, including in portable JSON backups. Version 1 files remain supported; image-containing exports use version 2 with a shared image table. Saves commit atomically and in order. Browser storage limits still apply; the editor keeps the previous save and offers a JSON backup if saving fails.

## Movies and recording

Export portrait 1080×1920 or landscape 1920×1080 movies at any positive integer FPS. Set Seconds per frame in either Settings or the export popup. Live playback, nested symbols, and recording previews also advance at the selected FPS. FPS controls sampling, independently of seconds per frame and frame timing multipliers: a one-second transition at 8 FPS produces eight movie frames. Numeric text fields commit on blur or Enter, leaving blank and partial entries untouched while typing. Compatible browsers use accelerated fixed-frame-rate MP4 encoding; others use real-time capture. Recording mode supports microphone audio and a draggable front-camera overlay. Use Share movie to open the device share sheet; a download fallback is offered if file sharing is unavailable. Camera and microphone require a secure origin (HTTPS or localhost), browser support, and permission.

## Structure and hosting

- `app/`: editor, timeline, import controls, and recording UI.
- `lib/`: animation, geometry, symbols, image handling, persistence, and export.
- `tests/animation.test.mjs`: geometry, playback, import, persistence, and recording tests.
- `vite.config.ts`, `build/`, `worker/`: vinext and Cloudflare-compatible build setup.
- `.openai/hosting.json`: existing Sites project binding. It contains no credentials.

The editor currently runs at https://procedural-animation-canvas.xox-studios.chatgpt.site. Repository publication does not change that site's access settings or automatically enable GitHub Pages.
