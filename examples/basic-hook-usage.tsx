// This file is part of @robomous/opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

/**
 * Example: Basic hook usage
 *
 * The simplest way to use @robomous/opencv-js-react — load OpenCV with the `useOpenCV` hook
 * and access the `cv` namespace for processing.
 *
 * OpenCV.js loads once (singleton) and is shared across all hook instances in
 * the app. Any component that calls useOpenCV() will receive the same instance.
 */
import { useOpenCV } from '@robomous/opencv-js-react';

export function BasicHookUsage() {
  const { cv, isReady, isLoading, error } = useOpenCV();

  if (isLoading) {
    return <p>Loading OpenCV…</p>;
  }

  if (error) {
    return <p>Failed to load OpenCV: {error.message}</p>;
  }

  if (!isReady || !cv) {
    return null;
  }

  // cv is the full OpenCV.js namespace — access any function via cv[name]
  // or the typed helpers like cv.imread, cv.imshow, cv.cvtColor, etc.
  console.log('OpenCV build info:', (cv as { getBuildInformation?: () => string }).getBuildInformation?.());

  return <p>OpenCV is ready.</p>;
}
