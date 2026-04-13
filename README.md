<img src="https://cdn.robomous.ai/public-images/robomous-banner.svg" alt="Robomous.ai" width=300 />

---

# @robomous/opencv-react

A React wrapper for the official OpenCV.js library — bring computer vision to your React apps using WebAssembly.

## Features

- **Two simple primitives**: `useOpenCV` hook and `OpenCVCanvas` component
- **Lazy loading**: OpenCV.js is loaded on demand, not at startup
- **SSR safe**: no browser APIs accessed during server render
- **Singleton loading**: the script is injected exactly once, regardless of how many components use it
- **Dual-canvas workflow**: read from an input canvas, write to an optional separate output canvas
- **Memory leak prevention**: clear documentation and examples for `Mat.delete()` cleanup
- **No bundled binary**: loads OpenCV.js from the official CDN by default; easy to swap for a self-hosted or contrib build

## Why this package

OpenCV.js is a powerful WebAssembly port of OpenCV, but integrating it into React requires managing async script loading, WASM initialization timing, canvas lifecycle, and memory cleanup. This package handles all of that so you can focus on writing your image processing logic.

This package is **browser-oriented**. It is not a generic Node.js image processing wrapper.

## Installation

```bash
# pnpm (recommended)
pnpm add @robomous/opencv-react

# npm
npm install @robomous/opencv-react

# yarn
yarn add @robomous/opencv-react
```

**Peer dependencies** (install separately if not already present):

```bash
pnpm add react react-dom
```

## Quick start

```tsx
import { OpenCVCanvas } from '@robomous/opencv-react';

export default function App() {
  return (
    <OpenCVCanvas
      src="/images/photo.jpg"
      onProcess={({ canvas, cv }) => {
        let src = null;
        let gray = null;
        try {
          src = cv.imread(canvas);
          gray = new cv.Mat();
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
          cv.imshow(canvas, gray);
        } finally {
          if (src) src.delete();
          if (gray) gray.delete();
        }
      }}
    />
  );
}
```

## Full example: separate input and output canvases

```tsx
import React, { useRef } from 'react';
import { OpenCVCanvas } from '@robomous/opencv-react';

export default function Demo() {
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div>
      <OpenCVCanvas
        src="/images/test.jpg"
        outputCanvasRef={outputCanvasRef}
        onProcess={({ canvas, cv, outputCanvas }) => {
          let src = null;
          let gray = null;
          let dst = null;
          let clahe = null;

          try {
            src = cv.imread(canvas);
            gray = new cv.Mat();
            dst = new cv.Mat();

            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
            clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
            clahe.apply(gray, dst);

            cv.imshow(outputCanvas || canvas, dst);
          } finally {
            if (src) src.delete();
            if (gray) gray.delete();
            if (dst) dst.delete();
            if (clahe) clahe.delete();
          }
        }}
      />

      <canvas ref={outputCanvasRef} />
    </div>
  );
}
```

## API reference

### `useOpenCV(options?)`

Hook that lazily loads OpenCV.js in the browser.

```ts
const { cv, isReady, isLoading, error, load } = useOpenCV(options?);
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoLoad` | `boolean` | `true` | Automatically load OpenCV when the component mounts |
| `src` | `string` | vendored asset | Override the OpenCV.js script URL |

**Return value:**

| Field | Type | Description |
|-------|------|-------------|
| `cv` | `OpenCVNamespace \| null` | The OpenCV namespace once ready, otherwise null |
| `isReady` | `boolean` | Whether OpenCV is fully initialized |
| `isLoading` | `boolean` | Whether OpenCV is currently loading |
| `error` | `Error \| null` | Load error, if any |
| `load` | `() => Promise<void>` | Manually trigger loading |

**Example:**

```tsx
function ProcessButton() {
  const { cv, isReady, isLoading, load } = useOpenCV({ autoLoad: false });

  return (
    <button onClick={load} disabled={isLoading || isReady}>
      {isLoading ? 'Loading OpenCV...' : 'Load OpenCV'}
    </button>
  );
}
```

### `OpenCVCanvas`

React component that renders an internal canvas, loads a source image, draws it, and calls your processing callback once OpenCV is ready.

```tsx
<OpenCVCanvas
  src="/image.jpg"
  outputCanvasRef={outputRef}
  autoProcess={true}
  className="my-canvas"
  crossOrigin="anonymous"
  onLoad={({ canvas, context, image }) => { /* image drawn */ }}
  onProcess={({ canvas, context, image, cv, outputCanvas }) => { /* process */ }}
  onError={(error) => { /* handle error */ }}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | required | Source image URL |
| `outputCanvasRef` | `RefObject<HTMLCanvasElement \| null>` | — | External canvas for processed output |
| `autoProcess` | `boolean` | `true` | Call `onProcess` automatically when ready |
| `className` | `string` | — | CSS class for the internal canvas |
| `crossOrigin` | `'' \| 'anonymous' \| 'use-credentials'` | — | Cross-origin attribute for the image |
| `onLoad` | `(payload: LoadPayload) => void` | — | Called after the image is drawn |
| `onProcess` | `(payload: ProcessPayload) => void \| Promise<void>` | — | Called when OpenCV is ready and image is drawn |
| `onError` | `(error: Error) => void` | — | Called on image load or processing errors |

**Process payload:**

```ts
interface ProcessPayload {
  canvas: HTMLCanvasElement;      // internal input canvas (image is drawn here)
  context: CanvasRenderingContext2D;
  image: HTMLImageElement;
  cv: OpenCVNamespace;            // the OpenCV instance
  outputCanvas?: HTMLCanvasElement; // external output canvas, if provided
}
```

**Important:** Always call `mat.delete()` for every `Mat` you create inside `onProcess` to prevent memory leaks. Use a `try/finally` block as shown in the examples.

## OpenCV.js source

`@robomous/opencv-react` does not bundle an OpenCV.js binary. By default it loads from the official CDN:

```
https://docs.opencv.org/4.13.0/opencv.js
```

To use a different version, a contrib build, or a self-hosted file, pass the `src` option:

```tsx
// Specific version from the official CDN
useOpenCV({ src: 'https://docs.opencv.org/4.10.0/opencv.js' })

// Self-hosted contrib build
useOpenCV({ src: '/assets/opencv-4.13.0-contrib.min.js' })

// Same option on OpenCVCanvas
<OpenCVCanvas src={imageUrl} opencvSrc="/assets/opencv.js" onProcess={...} />
```

### Building a contrib or custom OpenCV.js (optional)

Contrib modules (SIFT, SURF, etc.) are not available on the official CDN. Build them locally using Docker and the included build script:

```bash
# Standard build
pnpm run build:opencv:release -- --version 4.13.0

# Contrib build
pnpm run build:opencv:release -- --version 4.13.0 --with-contrib

# With separate .wasm file
pnpm run build:opencv:release -- --version 4.12.0 --disable-single-file
```

Supported versions: `4.10.0`, `4.11.0`, `4.12.0`, `4.13.0`. Output is written to `build/opencv-js/releases/`. Non-release versions (branches, SHAs, `main`) are rejected. To add a new release, add it to `SUPPORTED_RELEASES` in `scripts/helpers/opencv-release-config.sh`.

## Local development

```bash
git clone https://github.com/Robomous/opencv-react.git
cd opencv-js-react
pnpm install

# Run tests
pnpm run test

# Build the library
pnpm run build

# Typecheck
pnpm run typecheck

# Lint
pnpm run lint
```

Watch mode:

```bash
pnpm run dev          # tsup watch
pnpm run test:watch   # vitest watch
```

## Testing

```bash
pnpm run test         # run all tests once
pnpm run test:watch   # run in watch mode
```

Tests use [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/) and jsdom.

## Publishing

Publishing is triggered automatically when a GitHub release is published. The release workflow runs lint, typecheck, tests, and build, then publishes to npm using trusted publishing (OIDC). No OpenCV.js binary is required or included.

To configure npm trusted publishing:
- See [npm trusted publishers documentation](https://docs.npmjs.com/trusted-publishers/)
- Enable it in your npm package settings for the `Robomous/opencv-react` GitHub repository

Manual publish:

```bash
pnpm run prepack       # runs typecheck + test + build
pnpm publish --access public
```

## Contributing

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Make your changes
4. Run tests before opening a PR: `pnpm run test`
5. Keep public API changes documented in the README
6. Open a pull request — CI runs automatically

If you modify the Bash build workflow, preserve the release-only version validation and shallow-clone semantics. Non-release versions (branches, SHAs, `main`) must continue to be rejected.

PRs trigger CI automatically. Merging to `main` + publishing a GitHub release triggers the npm publish.

## License

Apache-2.0 — see [LICENSE](./LICENSE) for details.

## OpenCV.js sourcing note

This package does not bundle OpenCV.js. The default CDN URL points to the official [OpenCV.js builds](https://docs.opencv.org/) hosted by the OpenCV project. When building a local artifact using the included scripts, it is compiled from the official [OpenCV source repository](https://github.com/opencv/opencv) via `platforms/js/build_js.py` and Emscripten. No modifications are made to the OpenCV source. OpenCV is licensed under the Apache 2.0 license.
