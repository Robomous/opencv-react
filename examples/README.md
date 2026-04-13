# @robomous/opencv-js-react Examples

Self-contained code examples showing how to use the `@robomous/opencv-js-react` library. Copy any file into your own React project that has `@robomous/opencv-js-react` installed.

## Prerequisites

```bash
npm install @robomous/opencv-js-react react react-dom
# or
pnpm add @robomous/opencv-js-react react react-dom
```

---

## Examples

### [`basic-hook-usage.tsx`](./basic-hook-usage.tsx)
**`useOpenCV` — default automatic loading**

The minimal usage pattern. OpenCV loads automatically on mount; the component renders loading/error/ready states. Access the full `cv` namespace once `isReady` is true.

---

### [`deferred-loading.tsx`](./deferred-loading.tsx)
**`useOpenCV` — on-demand loading with `autoLoad: false`**

Defers loading OpenCV until the user clicks a button. Useful for pages where OpenCV is optional — avoids downloading the ~8 MB WASM binary unless it's actually needed. `load()` is a no-op after the first call.

---

### [`grayscale-filter.tsx`](./grayscale-filter.tsx)
**`OpenCVCanvas` — color-to-grayscale conversion**

Loads an image and converts it to grayscale using `cv.cvtColor`. Shows the core `onProcess` callback pattern, before/after display with `outputCanvasRef`, and proper `Mat` cleanup with `delete()` to prevent memory leaks.

---

### [`edge-detection.tsx`](./edge-detection.tsx)
**`OpenCVCanvas` — Canny edge detection**

Multi-step processing pipeline: RGBA → gray → Gaussian blur → Canny edges → display. Shows how to chain operations with intermediate Mats and use `try/finally` to ensure all Mats are deleted even when a step throws.

---

### [`threshold-adjustment.tsx`](./threshold-adjustment.tsx)
**`OpenCVCanvas` + `useOpenCV` — interactive binary threshold**

Combines both exports with React state to re-process an image in real-time as the user moves a slider. Shows how to trigger re-processing manually outside of the `onProcess` callback, using refs to avoid stale closures.

---

## Important: Memory Management

Every `cv.Mat` you create **must be deleted** when you're done with it. OpenCV.js allocates Mats in WASM memory outside the JavaScript garbage collector.

```tsx
const src = cv.imread(canvas);
const dst = new cv.Mat();
try {
  cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
  cv.imshow(outputCanvas, dst);
} finally {
  src.delete();
  dst.delete();
}
```

Forgetting to call `delete()` causes a memory leak that grows with every re-render.
