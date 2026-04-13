// This file is part of @robomous/opencv-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

import type { OpenCVNamespace } from './types';

declare global {
  interface Window {
    cv?: OpenCVNamespace | OpenCVFactory;
  }
}

/**
 * OpenCV.js 4.x exposes `window.cv` as either:
 * - A factory function/promise that resolves to the cv namespace
 * - The cv namespace directly (if already initialized)
 */
export type OpenCVFactory = {
  then: (resolve: (cv: OpenCVNamespace) => void) => void;
  onRuntimeInitialized?: () => void;
} & Partial<OpenCVNamespace>;
