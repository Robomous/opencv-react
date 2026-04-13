// This file is part of opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

/**
 * Example: Grayscale filter
 *
 * Converts a color image to grayscale using `OpenCVCanvas`. The component draws
 * the source image onto an internal canvas, then calls `onProcess` once both
 * the image and OpenCV are ready.
 *
 * Key patterns shown:
 * - `outputCanvasRef` — send processed output to a separate canvas (before/after)
 * - `cv.cvtColor` — color space conversion
 * - `mat.delete()` — ALWAYS delete every Mat you create to avoid memory leaks
 */
import { useRef } from 'react';
import { OpenCVCanvas } from 'opencv-js-react';
import type { ProcessPayload } from 'opencv-js-react';

const IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';

export function GrayscaleFilter() {
  const outputRef = useRef<HTMLCanvasElement>(null);

  function handleProcess({ cv, canvas, outputCanvas }: ProcessPayload) {
    if (!outputCanvas) return;

    const src = cv.imread(canvas);
    const gray = new cv.Mat();

    // Convert RGBA → grayscale, then back to RGBA so imshow can render it
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(gray, gray, cv.COLOR_GRAY2RGBA);
    cv.imshow(outputCanvas, gray);

    // Delete every Mat you create — OpenCV.js uses WASM memory outside the GC
    src.delete();
    gray.delete();
  }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div>
        <p>Original</p>
        {/* OpenCVCanvas renders the source image on the internal canvas */}
        <OpenCVCanvas
          src={IMAGE_URL}
          outputCanvasRef={outputRef}
          onProcess={handleProcess}
          onError={(err) => console.error('Processing failed:', err)}
        />
      </div>
      <div>
        <p>Grayscale</p>
        <canvas ref={outputRef} />
      </div>
    </div>
  );
}
