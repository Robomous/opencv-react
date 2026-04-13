#!/usr/bin/env node
// This file is part of @robomous/opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

/**
 * Verifies that the vendored OpenCV.js asset exists and is non-empty.
 * Exits with code 1 if the asset is missing or empty.
 *
 * Run as part of prepack: pnpm run verify:opencv
 *
 * Usage:
 *   pnpm run verify:opencv
 *   pnpm run verify:opencv -- --version 4.10.0
 */

import { stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_VERSION = '4.13.0';

// ─── Parse args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let version = DEFAULT_VERSION;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version' && args[i + 1]) {
    version = args[++i];
  }
}

const ASSET_PATH = join(ROOT, 'src', 'assets', 'opencv', `opencv-${version}.min.js`);
const MIN_SIZE_BYTES = 1024; // At least 1KB to rule out empty/placeholder files

if (!existsSync(ASSET_PATH)) {
  console.error(`ERROR: Vendored OpenCV.js asset not found at:`);
  console.error(`  ${ASSET_PATH}`);
  console.error(`\nTo generate it:`);
  console.error(`  1. pnpm run build:opencv:release -- --version ${version}`);
  console.error(`  2. pnpm run vendor:opencv -- --version ${version}`);
  process.exit(1);
}

const fileStat = await stat(ASSET_PATH);

if (fileStat.size < MIN_SIZE_BYTES) {
  console.error(`ERROR: Vendored OpenCV.js asset is too small (${fileStat.size} bytes).`);
  console.error(`  Expected a full OpenCV.js build (typically several MB).`);
  console.error(`  Path: ${ASSET_PATH}`);
  process.exit(1);
}

console.log(`✓ OpenCV ${version} vendored asset verified`);
console.log(`  Path: src/assets/opencv/opencv-${version}.min.js`);
console.log(`  Size: ${(fileStat.size / 1024 / 1024).toFixed(2)} MB`);
