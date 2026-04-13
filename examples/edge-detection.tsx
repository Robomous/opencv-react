// This file is part of @robomous/opencv-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

/**
 * Example: Edge detection (Canny)
 *
 * Runs the Canny edge detector on a source image using `OpenCVCanvas`.
 *
 * Pipeline: RGBA → gray → Gaussian blur → Canny → RGBA → display
 *
 * Key patterns shown:
 * - Chaining multiple OpenCV operations with intermediate Mats
 * - Deleting all intermediate Mats in a try/finally block to prevent leaks
 *   even when an operation throws
 * - Using the full OpenCV.js API through the index signature: cv['GaussianBlur']
 */
import { useRef } from 'react';
import { OpenCVCanvas } from '@robomous/opencv-react';
import type { OpenCVNamespace, ProcessPayload } from '@robomous/opencv-react';

const IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';

function runCanny(cv: OpenCVNamespace, src: HTMLCanvasElement, dst: HTMLCanvasElement) {
  const rgba = cv.imread(src);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const output = new cv.Mat();

  try {
    cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);

    // GaussianBlur is not in the minimal type declaration, so access via index
    (cv as unknown as Record<string, (...args: unknown[]) => void>)['GaussianBlur'](
      gray, blurred, new cv.Size(5, 5), 0
    );

    // Canny(src, dst, threshold1, threshold2)
    (cv as unknown as Record<string, (...args: unknown[]) => void>)['Canny'](
      blurred, edges, 50, 150
    );

    // Convert single-channel edge map back to RGBA for display
    cv.cvtColor(edges, output, cv.COLOR_GRAY2RGBA);
    cv.imshow(dst, output);
  } finally {
    // Clean up all Mats — always use try/finally so leaks don't accumulate on error
    rgba.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    output.delete();
  }
}

export function EdgeDetection() {
  const outputRef = useRef<HTMLCanvasElement>(null);

  function handleProcess({ cv, canvas, outputCanvas }: ProcessPayload) {
    if (!outputCanvas) return;
    runCanny(cv, canvas, outputCanvas);
  }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div>
        <p>Original</p>
        <OpenCVCanvas
          src={IMAGE_URL}
          outputCanvasRef={outputRef}
          onProcess={handleProcess}
          onError={(err) => console.error('Edge detection failed:', err)}
        />
      </div>
      <div>
        <p>Canny edges</p>
        <canvas ref={outputRef} />
      </div>
    </div>
  );
}
