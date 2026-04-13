// This file is part of @robomous/opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

import React, { useRef, useEffect, useCallback } from 'react';
import type { OpenCVCanvasProps } from '../types';
import { useOpenCV } from '../hooks/useOpenCV';

/**
 * A React component that renders an internal canvas, loads a source image,
 * draws it, and calls `onProcess` with the OpenCV instance once ready.
 *
 * The consumer is responsible for calling `mat.delete()` on all created Mats
 * inside `onProcess` to prevent memory leaks.
 *
 * @example
 * <OpenCVCanvas
 *   src="/image.jpg"
 *   outputCanvasRef={outputRef}
 *   onProcess={({ canvas, cv, outputCanvas }) => {
 *     let src = null;
 *     try {
 *       src = cv.imread(canvas);
 *       cv.imshow(outputCanvas || canvas, src);
 *     } finally {
 *       if (src) src.delete();
 *     }
 *   }}
 * />
 */
export function OpenCVCanvas({
  src,
  outputCanvasRef,
  autoProcess = true,
  className,
  crossOrigin,
  onLoad,
  onProcess,
  onError,
}: OpenCVCanvasProps) {
  const { cv, isReady } = useOpenCV();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isImageDrawnRef = useRef(false);

  // Refs for stable access to latest callbacks and state in effects
  const cvRef = useRef(cv);
  cvRef.current = cv;
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;
  const autoProcessRef = useRef(autoProcess);
  autoProcessRef.current = autoProcess;
  const onProcessRef = useRef(onProcess);
  onProcessRef.current = onProcess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const outputCanvasRefRef = useRef(outputCanvasRef);
  outputCanvasRefRef.current = outputCanvasRef;

  const runProcessing = useCallback(() => {
    if (!autoProcessRef.current || !onProcessRef.current) return;
    if (!isReadyRef.current || !cvRef.current) return;
    if (!isImageDrawnRef.current) return;

    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const outputCanvas = outputCanvasRefRef.current?.current ?? undefined;

    if (outputCanvas) {
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
    }

    const run = async () => {
      try {
        await onProcessRef.current!({
          canvas,
          context,
          image,
          cv: cvRef.current!,
          outputCanvas,
        });
      } catch (err) {
        onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    run();
  }, []);

  // Load and draw the source image whenever `src` changes
  useEffect(() => {
    let stale = false;
    isImageDrawnRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    if (crossOrigin !== undefined) {
      img.crossOrigin = crossOrigin;
    }

    img.onload = () => {
      if (stale) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        onErrorRef.current?.(new Error('Failed to get 2D context from canvas'));
        return;
      }

      context.drawImage(img, 0, 0);
      imageRef.current = img;
      isImageDrawnRef.current = true;

      onLoad?.({ canvas, context, image: img });

      // If cv is already ready, run processing immediately
      runProcessing();
    };

    img.onerror = () => {
      if (stale) return;
      onErrorRef.current?.(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;

    return () => {
      stale = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, crossOrigin]);

  // Run processing when OpenCV becomes ready (image may already be drawn)
  useEffect(() => {
    if (isReady && cv) {
      runProcessing();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, cv]);

  return <canvas ref={canvasRef} className={className} />;
}
