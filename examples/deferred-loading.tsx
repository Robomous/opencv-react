// This file is part of @robomous/opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

/**
 * Example: Deferred (on-demand) loading
 *
 * Use `autoLoad: false` when you don't need OpenCV on page load. OpenCV.js is
 * a large WASM binary (~8 MB), so deferring the load until the user actually
 * needs it can improve initial page performance.
 *
 * Call `load()` from any event handler to trigger the download on demand.
 * Subsequent calls to `load()` are no-ops — OpenCV loads exactly once.
 */
import { useOpenCV } from '@robomous/opencv-js-react';

export function DeferredLoading() {
  const { isReady, isLoading, error, load } = useOpenCV({ autoLoad: false });

  return (
    <div>
      <button onClick={load} disabled={isLoading || isReady}>
        {isLoading ? 'Loading OpenCV…' : isReady ? 'OpenCV ready' : 'Load OpenCV'}
      </button>

      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      {isReady && <p>OpenCV loaded successfully.</p>}
    </div>
  );
}
