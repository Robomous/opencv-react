// This file is part of @robomous/opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

import type { RefObject } from 'react';

/**
 * Minimal typing for the OpenCV.js namespace.
 * Consumers can augment this via module augmentation if needed.
 */
export interface OpenCVNamespace {
  // Core Mat
  Mat: new (...args: unknown[]) => CVMat;
  MatVector: new () => CVMatVector;
  Size: new (width: number, height: number) => CVSize;
  Point: new (x: number, y: number) => CVPoint;
  Scalar: new (v0: number, v1?: number, v2?: number, v3?: number) => CVScalar;
  CLAHE: new (clipLimit?: number, tileGridSize?: CVSize) => CVCLAHE;

  // Image I/O
  imread(canvas: HTMLCanvasElement | string): CVMat;
  imshow(canvas: HTMLCanvasElement | string, mat: CVMat): void;

  // Color conversion
  cvtColor(src: CVMat, dst: CVMat, code: number, dstCn?: number): void;

  // Runtime
  onRuntimeInitialized?: () => void;

  // Color conversion constants
  COLOR_RGBA2GRAY: number;
  COLOR_RGB2GRAY: number;
  COLOR_GRAY2RGBA: number;
  COLOR_BGR2RGB: number;
  COLOR_RGB2BGR: number;

  // Allow additional members from the full OpenCV.js API
  [key: string]: unknown;
}

export interface CVMat {
  delete(): void;
  rows: number;
  cols: number;
  data: Uint8Array;
  data32F: Float32Array;
  size(): CVSize;
}

export interface CVMatVector {
  delete(): void;
  size(): number;
  get(index: number): CVMat;
  push_back(mat: CVMat): void;
}

export interface CVSize {
  width: number;
  height: number;
}

export interface CVPoint {
  x: number;
  y: number;
}

export interface CVScalar {
  [index: number]: number;
}

export interface CVCLAHE {
  apply(src: CVMat, dst: CVMat): void;
  delete(): void;
}

// ─── Hook types ─────────────────────────────────────────────────────────────

export interface UseOpenCVOptions {
  /** Automatically load OpenCV when the component mounts. Defaults to true. */
  autoLoad?: boolean;
  /** Override the default OpenCV.js asset URL. */
  src?: string;
}

export interface UseOpenCVReturn {
  cv: OpenCVNamespace | null;
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  load: () => Promise<void>;
}

// ─── Component types ─────────────────────────────────────────────────────────

export interface LoadPayload {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  image: HTMLImageElement;
}

export interface ProcessPayload extends LoadPayload {
  cv: OpenCVNamespace;
  outputCanvas?: HTMLCanvasElement;
}

export interface OpenCVCanvasProps {
  /** Source image URL to load and draw onto the internal canvas. */
  src: string;
  /** Optional ref to an external output canvas for processed results. */
  outputCanvasRef?: RefObject<HTMLCanvasElement | null>;
  /**
   * Whether to call `onProcess` automatically after the image loads and
   * OpenCV is ready. Defaults to true.
   */
  autoProcess?: boolean;
  className?: string;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  /** Called once the source image has been drawn to the internal canvas. */
  onLoad?: (payload: LoadPayload) => void;
  /**
   * Called when OpenCV is ready and the image has been drawn.
   * Use the `finally` block to call `mat.delete()` on all created Mats.
   */
  onProcess?: (payload: ProcessPayload) => void | Promise<void>;
  /** Called when an error occurs during image loading or processing. */
  onError?: (error: Error) => void;
}
