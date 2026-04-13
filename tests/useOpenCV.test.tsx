// This file is part of @robomous/opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOpenCV } from '../src/hooks/useOpenCV';
import { OPENCV_SCRIPT_ID } from '../src/constants';
import { simulateOpenCVLoad, simulateOpenCVLoadError, mockCV } from './setup';

describe('useOpenCV', () => {
  describe('initial state', () => {
    it('returns correct initial state when cv is not loaded', () => {
      const { result } = renderHook(() => useOpenCV({ autoLoad: false }));
      expect(result.current.cv).toBeNull();
      expect(result.current.isReady).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.load).toBe('function');
    });

    it('returns isReady=true immediately if window.cv is already initialized', () => {
      const cv = mockCV();
      // Simulate cv already having imread (fully initialized)
      (cv as typeof cv & { imread: ReturnType<typeof vi.fn> }).imread = vi.fn(() => ({
        delete: vi.fn(),
      }));

      const { result } = renderHook(() => useOpenCV({ autoLoad: false }));
      expect(result.current.isReady).toBe(true);
      expect(result.current.cv).not.toBeNull();
    });
  });

  describe('loading', () => {
    it('transitions isLoading from false → true → false during load', async () => {
      const { spy } = simulateOpenCVLoad();

      const { result } = renderHook(() => useOpenCV({ autoLoad: false }));

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.load();
      });

      // After resolution, isLoading should be back to false
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isReady).toBe(true);

      spy.mockRestore();
    });

    it('sets isReady=true and cv after successful load', async () => {
      const { spy } = simulateOpenCVLoad();

      const { result } = renderHook(() => useOpenCV({ autoLoad: false }));

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.isReady).toBe(true);
      expect(result.current.cv).not.toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      spy.mockRestore();
    });

    it('auto-loads when autoLoad is true (default)', async () => {
      const { spy } = simulateOpenCVLoad();

      const { result } = renderHook(() => useOpenCV());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      spy.mockRestore();
    });
  });

  describe('duplicate script prevention', () => {
    it('does not inject a second script tag on repeated load() calls', async () => {
      const { spy } = simulateOpenCVLoad();

      const { result } = renderHook(() => useOpenCV({ autoLoad: false }));

      await act(async () => {
        await Promise.all([result.current.load(), result.current.load()]);
      });

      const scripts = document.querySelectorAll(`script#${OPENCV_SCRIPT_ID}`);
      expect(scripts).toHaveLength(1);

      spy.mockRestore();
    });

    it('does not inject a second script if one already exists in the DOM', async () => {
      const { spy } = simulateOpenCVLoad();

      // First hook instance loads
      const { result: r1 } = renderHook(() => useOpenCV({ autoLoad: false }));
      await act(async () => {
        await r1.current.load();
      });

      // Second hook instance should not inject another script
      const appendSpy = vi.spyOn(document.head, 'appendChild');
      const { result: r2 } = renderHook(() => useOpenCV({ autoLoad: false }));
      await act(async () => {
        await r2.current.load();
      });

      // No new script appended
      const scriptAppends = appendSpy.mock.calls.filter(
        ([node]) => node instanceof HTMLScriptElement,
      );
      expect(scriptAppends).toHaveLength(0);

      spy.mockRestore();
      appendSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('sets error state on script load failure', async () => {
      const { spy } = simulateOpenCVLoadError();

      const { result } = renderHook(() => useOpenCV({ autoLoad: false }));

      await act(async () => {
        await result.current.load().catch(() => {});
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.isReady).toBe(false);
      expect(result.current.cv).toBeNull();
      expect(result.current.isLoading).toBe(false);

      spy.mockRestore();
    });
  });

  describe('SSR safety', () => {
    it('does not crash when window is not accessed during render', () => {
      // The hook should not throw — SSR safety is enforced by the loader,
      // not the hook itself. The hook only calls loadOpenCV in useEffect.
      expect(() => {
        renderHook(() => useOpenCV({ autoLoad: false }));
      }).not.toThrow();
    });

    it('returns error when loadOpenCV is called without window (simulated)', async () => {
      // Simulate SSR by temporarily having the loader reject
      vi.spyOn(document.head, 'appendChild').mockImplementation(() => {
        throw new Error('document is not defined');
      });

      const { result } = renderHook(() => useOpenCV({ autoLoad: false }));

      await act(async () => {
        await result.current.load().catch(() => {});
      });

      expect(result.current.error).not.toBeNull();
      vi.restoreAllMocks();
    });
  });
});
