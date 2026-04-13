// This file is part of opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

/**
 * Example: Interactive threshold adjustment
 *
 * Combines `useOpenCV` + `OpenCVCanvas` with React state to re-process an image
 * in real-time as the user moves a slider.
 *
 * Key patterns shown:
 * - `autoProcess: false` — prevent automatic processing on load; we control when
 *   processing runs by passing the threshold value through a ref
 * - Using `useOpenCV` to check readiness before enabling controls
 * - Storing the latest slider value in a ref so `onProcess` always reads the
 *   current value without creating stale closures
 */
import { useRef, useState } from 'react';
import { OpenCVCanvas, useOpenCV } from 'opencv-js-react';
import type { OpenCVNamespace, ProcessPayload } from 'opencv-js-react';

const IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';

function applyThreshold(
  cv: OpenCVNamespace,
  src: HTMLCanvasElement,
  dst: HTMLCanvasElement,
  threshold: number,
) {
  const rgba = cv.imread(src);
  const gray = new cv.Mat();
  const binary = new cv.Mat();
  const output = new cv.Mat();

  try {
    cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);

    // threshold(src, dst, thresh, maxval, type) — THRESH_BINARY = 0
    (cv as unknown as Record<string, (...args: unknown[]) => void>)['threshold'](
      gray, binary, threshold, 255, 0
    );

    cv.cvtColor(binary, output, cv.COLOR_GRAY2RGBA);
    cv.imshow(dst, output);
  } finally {
    rgba.delete();
    gray.delete();
    binary.delete();
    output.delete();
  }
}

export function ThresholdAdjustment() {
  const { isReady } = useOpenCV();
  const [threshold, setThreshold] = useState(128);

  // Keep a ref so onProcess always reads the latest value without re-subscribing
  const thresholdRef = useRef(threshold);
  const outputRef = useRef<HTMLCanvasElement>(null);

  // Store the latest canvas so we can re-trigger processing from the slider
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cvRef = useRef<OpenCVNamespace | null>(null);

  function handleProcess({ cv, canvas, outputCanvas }: ProcessPayload) {
    if (!outputCanvas) return;
    canvasRef.current = canvas;
    cvRef.current = cv;
    applyThreshold(cv, canvas, outputCanvas, thresholdRef.current);
  }

  function handleSliderChange(value: number) {
    thresholdRef.current = value;
    setThreshold(value);

    // Re-run processing immediately with the new threshold
    if (cvRef.current && canvasRef.current && outputRef.current) {
      applyThreshold(cvRef.current, canvasRef.current, outputRef.current, value);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label>
          Threshold: {threshold}
          <input
            type="range"
            min={0}
            max={255}
            value={threshold}
            disabled={!isReady}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <p>Original</p>
          {/* autoProcess triggers onProcess once on load; slider updates re-run it manually */}
          <OpenCVCanvas
            src={IMAGE_URL}
            outputCanvasRef={outputRef}
            onProcess={handleProcess}
            onError={(err) => console.error('Threshold failed:', err)}
          />
        </div>
        <div>
          <p>Threshold (t={threshold})</p>
          <canvas ref={outputRef} />
        </div>
      </div>
    </div>
  );
}
