// This file is part of @robomous/opencv-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UseOpenCVOptions, UseOpenCVReturn, OpenCVNamespace } from '../types';
import { loadOpenCV, getCV } from '../loader/loadOpenCV';

/**
 * Hook that lazily loads OpenCV.js in the browser and exposes its readiness state.
 *
 * Safe to use in SSR environments — no browser APIs are accessed during render.
 *
 * @example
 * const { cv, isReady, isLoading, error, load } = useOpenCV();
 */
export function useOpenCV(options?: UseOpenCVOptions): UseOpenCVReturn {
  const { autoLoad = true, src } = options ?? {};

  const [cv, setCV] = useState<OpenCVNamespace | null>(() => getCV());
  const [isReady, setIsReady] = useState<boolean>(() => getCV() !== null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Stable ref to avoid stale closure issues in load()
  const srcRef = useRef(src);
  srcRef.current = src;

  const load = useCallback(async () => {
    // Already ready
    const current = getCV();
    if (current) {
      setCV(current);
      setIsReady(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loadOpenCV(srcRef.current);
      const loaded = getCV();
      setCV(loaded);
      setIsReady(loaded !== null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      load();
    }
  }, [autoLoad, load]);

  return { cv, isReady, isLoading, error, load };
}
