# Changelog 1.2.0 — Interactive Preview Layers

## Added

- Direct layer dragging inside the template preview.
- Four resize handles on every selected layer.
- Shift-key aspect-ratio locking while resizing.
- Automatic video-frame extraction through FFmpeg when a layer source is selected.
- Image/video source metadata and preview cache.
- Cross Dissolve transition in template and batch transition selections.
- FFmpeg transition-name normalization for Cross Dissolve.

## Fixed

- Dragging and resizing no longer rebuild the whole canvas on every pointer event.
- Pointer capture remains active while the mouse leaves the layer bounds.
- Layer coordinates and dimensions update live in the property panel.
- Layer movement and resizing are constrained to the canvas.

## Tests

- Source syntax: 38 JavaScript files.
- Automated suite: 15/15 passed.
- Actual FFmpeg frame extraction passed using sample stock video.
- Core stock render smoke test passed.
- Greenscreen/overlay layer smoke test passed.
