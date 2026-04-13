// This file is part of @robomous/opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

/** The OpenCV version vendored in this package. */
export const OPENCV_VERSION = '4.13.0';

/** ID applied to the injected OpenCV script tag — prevents duplicate injection. */
export const OPENCV_SCRIPT_ID = 'opencv-js-react-script';

/**
 * Default URL for OpenCV.js — the official CDN build for the current version.
 *
 * To use a different version, contrib build, or self-hosted asset, pass the
 * `src` option to `useOpenCV()` or `OpenCVCanvas`:
 *
 *   useOpenCV({ src: '/assets/opencv-4.13.0-contrib.min.js' })
 */
export function getDefaultOpenCVUrl(): string {
  return `https://docs.opencv.org/${OPENCV_VERSION}/opencv.js`;
}
