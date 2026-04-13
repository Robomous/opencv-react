// This file is part of opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

import type { OpenCVNamespace } from '../types';
import type { OpenCVFactory } from '../global';
import { OPENCV_SCRIPT_ID, getDefaultOpenCVUrl } from '../constants';

/** Singleton promise — ensures OpenCV.js is injected and initialized only once. */
let loadPromise: Promise<void> | null = null;

/**
 * Returns the resolved, initialized `window.cv` namespace, or null if not ready.
 */
function getReadyCV(): OpenCVNamespace | null {
  const cv = window.cv as OpenCVNamespace | OpenCVFactory | undefined;
  if (!cv) return null;
  // Check if it's the namespace directly (has imread as a function)
  if (typeof (cv as OpenCVNamespace).imread === 'function') {
    return cv as OpenCVNamespace;
  }
  return null;
}

/**
 * Waits for `window.cv` to be initialized. OpenCV.js 4.x exposes `cv` as a
 * thenable factory on some builds, or directly calls `cv.onRuntimeInitialized`.
 */
function waitForCV(): Promise<void> {
  return new Promise((resolve, reject) => {
    const cv = window.cv as OpenCVFactory | OpenCVNamespace | undefined;

    if (!cv) {
      reject(new Error('OpenCV script loaded but window.cv is undefined'));
      return;
    }

    // Already fully initialized (has imread)
    if (typeof (cv as OpenCVNamespace).imread === 'function') {
      resolve();
      return;
    }

    // Promise/thenable pattern (common in OpenCV.js 4.x)
    if (typeof (cv as OpenCVFactory).then === 'function') {
      (cv as OpenCVFactory).then((resolvedCV) => {
        window.cv = resolvedCV;
        resolve();
      });
      return;
    }

    // onRuntimeInitialized callback pattern (older builds)
    const factory = cv as OpenCVFactory;
    factory.onRuntimeInitialized = () => {
      resolve();
    };
  });
}

/**
 * Loads OpenCV.js into the browser exactly once (singleton).
 * Safe to call multiple times — subsequent calls return the same promise.
 *
 * @param src - Optional URL override. Defaults to the vendored packaged asset.
 */
export function loadOpenCV(src?: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OpenCV.js cannot be loaded in a non-browser environment'));
  }

  // Already initialized
  if (getReadyCV()) {
    return Promise.resolve();
  }

  // Return existing in-flight load
  if (loadPromise) {
    return loadPromise;
  }

  // Check for existing script tag (e.g. injected by another lib or SSR hydration)
  const existing = document.getElementById(OPENCV_SCRIPT_ID);
  if (existing) {
    loadPromise = waitForCV();
    return loadPromise;
  }

  const url = src ?? getDefaultOpenCVUrl();
  const isRemote = url.startsWith('http://') || url.startsWith('https://');

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = OPENCV_SCRIPT_ID;
    script.async = true;
    if (isRemote) {
      script.crossOrigin = 'anonymous';
    }
    script.src = url;

    script.onload = () => {
      waitForCV().then(resolve).catch(reject);
    };

    script.onerror = () => {
      loadPromise = null;
      reject(new Error(`Failed to load OpenCV.js from: ${url}`));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Returns the current OpenCV namespace if loaded and ready, otherwise null.
 */
export function getCV(): OpenCVNamespace | null {
  if (typeof window === 'undefined') return null;
  return getReadyCV();
}

/**
 * Resets the singleton loader state.
 * Intended for use in tests only — do not call in production code.
 */
export function _resetForTesting(): void {
  loadPromise = null;
}
