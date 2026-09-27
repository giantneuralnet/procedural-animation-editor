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

- Draw straight lines, Bézier curves, brush strokes, circles, and rectangles.
- Select, box-select control points, and move, scale, or rotate selections.
- Turn grid and shape snapping on or off; pinch to zoom.
- Edit colors, styles, layer order, locks, and symbol tint from the selection menu.
- Copy shapes normally or make linked symbol copies; unlink from inside a shared symbol.
- Add, copy, delete, and reorder frames. Frame timing supports fractional and longer multiples of the timeline speed. Playback jumps from the final frame to the first without holding.
- Tap empty canvas space for Paste and Import. Import photos/images or saved animation JSON files. Imported animations become independent editable symbols; use Load to replace the whole project instead.

## Images and saving

Photos are resized to at most 1600 pixels on their longest side and embedded as image data in the project. Images move, resize, rotate, copy, animate, and render inside symbols and movies. Native photo/file pickers depend on the device and browser; unsupported image formats produce a message.

Projects automatically save to local storage on this device. Save JSON makes a portable backup containing images, timelines, and symbol definitions. Browser storage limits apply; the editor offers a JSON backup if automatic saving fails.

## Movies and recording

Export portrait 1080×1920 or landscape 1920×1080 movies. Compatible browsers use accelerated fixed-frame-rate MP4 encoding; others use real-time capture. Recording mode supports microphone audio and a draggable front-camera overlay. Camera and microphone require a secure origin (HTTPS or localhost), browser support, and permission.

## Structure and hosting

- `app/`: editor, timeline, import controls, and recording UI.
- `lib/`: animation, geometry, symbols, image handling, persistence, and export.
- `tests/animation.test.mjs`: geometry, playback, import, persistence, and recording tests.
- `vite.config.ts`, `build/`, `worker/`: vinext and Cloudflare-compatible build setup.
- `.openai/hosting.json`: existing Sites project binding. It contains no credentials.

The editor currently runs at https://procedural-animation-canvas.xox-studios.chatgpt.site. Repository publication does not change that site's access settings or automatically enable GitHub Pages.
