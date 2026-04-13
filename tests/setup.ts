// This file is part of @robomous/opencv-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { _resetForTesting } from '../src/loader/loadOpenCV';

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
  // Reset the OpenCV loader singleton so tests don't bleed into each other
  _resetForTesting();
  // Remove any injected script tags
  document.querySelectorAll('script[id]').forEach((s) => s.remove());
  // Reset window.cv
  delete (window as Window & { cv?: unknown }).cv;
});

// ─── Canvas mock ──────────────────────────────────────────────────────────────
// jsdom does not implement CanvasRenderingContext2D — provide a minimal stub.
const mockContext: Partial<CanvasRenderingContext2D> = {
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
    colorSpace: 'srgb',
  })),
  putImageData: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
};

HTMLCanvasElement.prototype.getContext = vi.fn(
  () => mockContext as CanvasRenderingContext2D,
) as typeof HTMLCanvasElement.prototype.getContext;

// ─── Image mock ───────────────────────────────────────────────────────────────
// Provide helpers to control Image load/error in tests.

export function mockImageLoad(naturalWidth = 100, naturalHeight = 100) {
  const originalImage = global.Image;

  const MockImage = vi.fn().mockImplementation(() => {
    const img: Partial<HTMLImageElement> & { _triggerLoad?: () => void; _triggerError?: () => void } = {
      naturalWidth,
      naturalHeight,
      crossOrigin: '',
      src: '',
    };

    // Allow tests to trigger load/error
    img._triggerLoad = () => {
      if (img.onload) (img.onload as EventListener)(new Event('load'));
    };
    img._triggerError = () => {
      if (img.onerror) (img.onerror as EventListener)(new Event('error'));
    };

    // Auto-trigger load when src is set (for simpler tests)
    Object.defineProperty(img, 'src', {
      set(value: string) {
        (img as { _src?: string })._src = value;
        // Defer to next microtask so event handlers can be attached first
        Promise.resolve().then(() => img._triggerLoad!());
      },
      get() {
        return (img as { _src?: string })._src ?? '';
      },
    });

    return img;
  });

  global.Image = MockImage as unknown as typeof Image;

  return {
    MockImage,
    restore: () => {
      global.Image = originalImage;
    },
  };
}

// ─── OpenCV mock ──────────────────────────────────────────────────────────────
export function mockCV() {
  const cv = {
    imread: vi.fn(() => ({ delete: vi.fn(), rows: 100, cols: 100 })),
    imshow: vi.fn(),
    cvtColor: vi.fn(),
    COLOR_RGBA2GRAY: 6,
    Mat: vi.fn(() => ({ delete: vi.fn() })),
    Size: vi.fn(() => ({ width: 8, height: 8 })),
    CLAHE: vi.fn(() => ({ apply: vi.fn(), delete: vi.fn() })),
  };

  (window as Window & { cv?: unknown }).cv = cv;
  return cv;
}

// ─── Script injection helper ─────────────────────────────────────────────────
/**
 * Simulates a successful OpenCV.js script load by:
 * 1. Watching for script injection
 * 2. Setting window.cv (with imread) THEN triggering the script's onload
 *
 * window.cv is intentionally NOT set until the simulated onload fires,
 * so the loader goes through the full script-injection path.
 */
export function simulateOpenCVLoad() {
  const cv = {
    imread: vi.fn(() => ({ delete: vi.fn(), rows: 100, cols: 100 })),
    imshow: vi.fn(),
    cvtColor: vi.fn(),
    COLOR_RGBA2GRAY: 6,
    Mat: vi.fn(() => ({ delete: vi.fn() })),
    Size: vi.fn(() => ({ width: 8, height: 8 })),
    CLAHE: vi.fn(() => ({ apply: vi.fn(), delete: vi.fn() })),
  };

  const originalAppendChild = document.head.appendChild.bind(document.head);
  const spy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    const result = originalAppendChild(node);
    if (node instanceof HTMLScriptElement) {
      Promise.resolve().then(() => {
        // Set window.cv BEFORE triggering onload so waitForCV() resolves
        (window as Window & { cv?: unknown }).cv = cv;
        if (node.onload) (node.onload as EventListener)(new Event('load'));
      });
    }
    return result;
  });

  return { cv, spy };
}

/**
 * Simulates a failed OpenCV.js script load.
 */
export function simulateOpenCVLoadError() {
  const spy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    const result = document.head.appendChild.call(document.head, node);
    if (node instanceof HTMLScriptElement) {
      Promise.resolve().then(() => {
        if (node.onerror) (node.onerror as EventListener)(new Event('error'));
      });
    }
    return result;
  });

  return { spy };
}
