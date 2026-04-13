#!/usr/bin/env node
// This file is part of @robomous/opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

/**
 * Vendors the locally-built OpenCV.js release artifact into src/assets/opencv/.
 *
 * Run AFTER scripts/build-opencv-js-release.sh has produced a build:
 *   pnpm run build:opencv:release -- --version 4.13.0
 *   pnpm run vendor:opencv
 *
 * Usage:
 *   pnpm run vendor:opencv [--version <version>] [--with-contrib]
 *
 * If --version is not specified, defaults to 4.13.0.
 */

import { copyFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_VERSION = '4.13.0';

// ─── Parse args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let version = DEFAULT_VERSION;
let withContrib = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version' && args[i + 1]) {
    version = args[++i];
  } else if (args[i] === '--with-contrib') {
    withContrib = true;
  }
}

// ─── Resolve paths ───────────────────────────────────────────────────────────
const packageName = withContrib ? `OpenCV-${version}-contrib` : `OpenCV-${version}`;
const releaseDir = join(ROOT, 'build', 'opencv-js', 'releases', packageName);
const srcFile = join(releaseDir, 'opencv.js');
const destDir = join(ROOT, 'src', 'assets', 'opencv');
const destFile = join(destDir, `opencv-${version}.min.js`);

// ─── Validate source exists ──────────────────────────────────────────────────
if (!existsSync(srcFile)) {
  console.error(`ERROR: Built opencv.js not found at:\n  ${srcFile}`);
  console.error(`\nRun the build first:\n  pnpm run build:opencv:release -- --version ${version}${withContrib ? ' --with-contrib' : ''}`);
  process.exit(1);
}

const srcStat = await stat(srcFile);
if (srcStat.size === 0) {
  console.error(`ERROR: Built opencv.js at ${srcFile} is empty.`);
  process.exit(1);
}

// ─── Copy to src/assets ──────────────────────────────────────────────────────
await mkdir(destDir, { recursive: true });
await copyFile(srcFile, destFile);

const destStat = await stat(destFile);
console.log(`✓ Vendored ${packageName}/opencv.js → src/assets/opencv/opencv-${version}.min.js`);
console.log(`  Size: ${(destStat.size / 1024).toFixed(1)} KB`);

// Also copy .wasm if present (for --disable_single_file builds)
const wasmSrc = join(releaseDir, 'opencv.wasm');
if (existsSync(wasmSrc)) {
  const wasmDest = join(destDir, `opencv-${version}.wasm`);
  await copyFile(wasmSrc, wasmDest);
  console.log(`✓ Also copied opencv.wasm → src/assets/opencv/opencv-${version}.wasm`);
}
