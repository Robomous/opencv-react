// This file is part of @robomous/opencv-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { OpenCVCanvas } from '../src/components/OpenCVCanvas';
import { simulateOpenCVLoad, mockImageLoad } from './setup';

describe('OpenCVCanvas', () => {
  let restoreImage: () => void;
  let restoreScript: ReturnType<typeof simulateOpenCVLoad>['spy'] | undefined;

  beforeEach(() => {
    ({ restore: restoreImage } = mockImageLoad());
    ({ spy: restoreScript } = simulateOpenCVLoad());
  });

  afterEach(() => {
    restoreImage();
    restoreScript?.mockRestore();
  });

  describe('rendering', () => {
    it('renders a canvas element', () => {
      render(<OpenCVCanvas src="/test.jpg" autoProcess={false} />);
      expect(document.querySelector('canvas')).toBeInTheDocument();
    });

    it('applies className to the canvas', () => {
      render(<OpenCVCanvas src="/test.jpg" className="my-canvas" autoProcess={false} />);
      expect(document.querySelector('canvas')).toHaveClass('my-canvas');
    });
  });

  describe('image loading', () => {
    it('loads the source image', async () => {
      render(<OpenCVCanvas src="/test.jpg" autoProcess={false} />);

      await waitFor(() => {
        // Image constructor should have been called
        expect(global.Image).toHaveBeenCalled();
      });
    });

    it('calls onLoad after the image is drawn', async () => {
      const onLoad = vi.fn();
      render(
        <OpenCVCanvas src="/test.jpg" onLoad={onLoad} autoProcess={false} />,
      );

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledOnce();
      });

      const payload = onLoad.mock.calls[0][0];
      expect(payload).toHaveProperty('canvas');
      expect(payload).toHaveProperty('context');
      expect(payload).toHaveProperty('image');
    });

    it('calls onError when image fails to load', async () => {
      // Override Image mock to trigger error instead of load
      const OriginalImage = global.Image;
      global.Image = vi.fn().mockImplementation(() => {
        const img: Partial<HTMLImageElement> = {};
        Object.defineProperty(img, 'src', {
          set() {
            Promise.resolve().then(() => {
              if (img.onerror) (img.onerror as EventListener)(new Event('error'));
            });
          },
          get() { return ''; },
        });
        return img;
      }) as unknown as typeof Image;

      const onError = vi.fn();
      render(<OpenCVCanvas src="/bad.jpg" onError={onError} autoProcess={false} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledOnce();
      });

      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
      global.Image = OriginalImage;
    });
  });

  describe('onProcess', () => {
    it('calls onProcess when OpenCV is ready and image is drawn', async () => {
      const onProcess = vi.fn();

      render(
        <OpenCVCanvas src="/test.jpg" onProcess={onProcess} />,
      );

      await waitFor(() => {
        expect(onProcess).toHaveBeenCalledOnce();
      });

      const payload = onProcess.mock.calls[0][0];
      expect(payload).toHaveProperty('canvas');
      expect(payload).toHaveProperty('context');
      expect(payload).toHaveProperty('image');
      expect(payload).toHaveProperty('cv');
    });

    it('does not call onProcess when autoProcess is false', async () => {
      const onProcess = vi.fn();

      render(
        <OpenCVCanvas src="/test.jpg" onProcess={onProcess} autoProcess={false} />,
      );

      // Wait for image load to complete
      await waitFor(() => {
        expect(global.Image).toHaveBeenCalled();
      });

      // Give enough time for any potential async process call
      await new Promise((r) => setTimeout(r, 50));
      expect(onProcess).not.toHaveBeenCalled();
    });

    it('passes outputCanvas in the onProcess payload when outputCanvasRef is provided', async () => {
      const onProcess = vi.fn();
      const outputCanvasRef = createRef<HTMLCanvasElement>();

      render(
        <div>
          <OpenCVCanvas
            src="/test.jpg"
            onProcess={onProcess}
            outputCanvasRef={outputCanvasRef}
          />
          <canvas ref={outputCanvasRef} />
        </div>,
      );

      await waitFor(() => {
        expect(onProcess).toHaveBeenCalledOnce();
      });

      const payload = onProcess.mock.calls[0][0];
      expect(payload.outputCanvas).toBe(outputCanvasRef.current);
    });

    it('does not call onProcess when outputCanvasRef is not attached', async () => {
      // Unattached ref — current is null
      const outputCanvasRef = createRef<HTMLCanvasElement>();
      const onProcess = vi.fn();

      render(
        <OpenCVCanvas
          src="/test.jpg"
          onProcess={onProcess}
          outputCanvasRef={outputCanvasRef}
        />,
      );

      await waitFor(() => {
        expect(onProcess).toHaveBeenCalledOnce();
      });

      // outputCanvas should be undefined when ref isn't attached
      expect(onProcess.mock.calls[0][0].outputCanvas).toBeUndefined();
    });

    it('forwards processing errors to onError', async () => {
      const processingError = new Error('cv operation failed');
      const onProcess = vi.fn().mockRejectedValue(processingError);
      const onError = vi.fn();

      render(
        <OpenCVCanvas src="/test.jpg" onProcess={onProcess} onError={onError} />,
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledOnce();
      });

      expect(onError.mock.calls[0][0]).toBe(processingError);
    });

    it('handles synchronous errors thrown from onProcess', async () => {
      const onProcess = vi.fn().mockImplementation(() => {
        throw new Error('sync error');
      });
      const onError = vi.fn();

      render(
        <OpenCVCanvas src="/test.jpg" onProcess={onProcess} onError={onError} />,
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledOnce();
      });

      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });

  describe('race conditions', () => {
    it('does not call onLoad when src changes before image loads', async () => {
      const onLoad = vi.fn();

      // Use a slow-loading image mock — track triggers per-image
      const OriginalImage = global.Image;
      const triggers: Array<() => void> = [];

      global.Image = vi.fn().mockImplementation(() => {
        const img: Partial<HTMLImageElement> = {
          naturalWidth: 100,
          naturalHeight: 100,
        };
        Object.defineProperty(img, 'src', {
          set() {
            // Capture a trigger for THIS image instance
            const triggerFn = () => {
              if (img.onload) (img.onload as EventListener)(new Event('load'));
            };
            triggers.push(triggerFn);
          },
          get() { return ''; },
        });
        return img;
      }) as unknown as typeof Image;

      const { rerender } = render(
        <OpenCVCanvas src="/first.jpg" onLoad={onLoad} autoProcess={false} />,
      );

      // Change src before the first image loads — stale flag set on first effect
      rerender(<OpenCVCanvas src="/second.jpg" onLoad={onLoad} autoProcess={false} />);

      // Trigger the first image's load (stale — should be ignored)
      triggers[0]?.();

      await new Promise((r) => setTimeout(r, 50));
      expect(onLoad).not.toHaveBeenCalled();

      global.Image = OriginalImage;
    });
  });
});
