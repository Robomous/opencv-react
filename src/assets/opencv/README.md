# OpenCV.js Local Asset (optional)

The `@robomous/opencv-react` package does **not** bundle an OpenCV.js binary. By default it loads
OpenCV.js from the official CDN at runtime:

```
https://docs.opencv.org/4.13.0/opencv.js
```

You can override this with any URL via the `src` option:

```tsx
useOpenCV({ src: '/assets/opencv-4.13.0-contrib.min.js' })
<OpenCVCanvas src={img} opencvSrc="https://my-cdn.example.com/opencv.js" />
```

## When to build a local asset

Use the build workflow when you need:

- **Contrib modules** (SIFT, SURF, etc.) — not available on the official CDN
- **Self-hosting** — strict CSP / offline environments
- **A specific older version** not available on the CDN

## How to build

**Requires:** Docker

```bash
# Standard build
pnpm run build:opencv:release -- --version 4.13.0

# Contrib build
pnpm run build:opencv:release -- --version 4.13.0 --with-contrib

# Then copy the artifact here for local testing
pnpm run vendor:opencv
```

Output is written to `build/opencv-js/releases/`. Point the `src` option at the resulting
file to use it in your app.

## Note

Files matching `*.js` and `*.wasm` in this directory are gitignored. If a file is
present when `pnpm run build` runs, tsup will copy it into `dist/assets/opencv/` —
useful for local testing but not part of the published package.
