#!/usr/bin/env bash
# This file is part of @robomous/opencv-react project from Robomous.
# It is subject to the license terms in the LICENSE file found in the top-level directory

# =============================================================================
# test-all-versions.sh
#
# Validates all supported OpenCV.js artifacts by running vendor → verify → build
# for each version × variant combination (standard + contrib).
#
# Usage:
#   bash scripts/test-all-versions.sh
#   pnpm run test:all-versions
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

VERSIONS=("4.10.0" "4.11.0" "4.12.0" "4.13.0")
VARIANTS=("standard" "contrib")

PASS=0
FAIL=0
declare -a RESULTS

echo "============================================================"
echo "  @robomous/opencv-react: Testing all OpenCV.js versions"
echo "============================================================"
echo ""

for version in "${VERSIONS[@]}"; do
  for variant in "${VARIANTS[@]}"; do
    label="${version}"
    vendor_args="--version ${version}"
    verify_args="--version ${version}"
    contrib_flag=""

    if [[ "${variant}" == "contrib" ]]; then
      label="${version}-contrib"
      vendor_args="${vendor_args} --with-contrib"
      contrib_flag=" --with-contrib"
    fi

    echo "──────────────────────────────────────────────"
    echo "  Testing OpenCV-${label}"
    echo "──────────────────────────────────────────────"

    # ── 1. Clean previous vendored file for this version ────────────────────
    rm -f "src/assets/opencv/opencv-${version}.min.js"
    rm -f "src/assets/opencv/opencv-${version}.wasm"

    # ── 2. Vendor ────────────────────────────────────────────────────────────
    echo "  → Vendor..."
    if ! node scripts/vendor-opencv.mjs ${vendor_args}; then
      RESULTS+=("FAIL  OpenCV-${label}  (vendor failed)")
      ((FAIL++)) || true
      continue
    fi

    # ── 3. Verify ────────────────────────────────────────────────────────────
    echo "  → Verify..."
    if ! node scripts/verify-opencv-version.mjs ${verify_args}; then
      RESULTS+=("FAIL  OpenCV-${label}  (verify failed)")
      ((FAIL++)) || true
      rm -f "src/assets/opencv/opencv-${version}.min.js"
      continue
    fi

    # ── 4. Build (tsup — clean:true wipes dist/ each time) ──────────────────
    echo "  → Build..."
    if ! pnpm run build --silent 2>/dev/null; then
      RESULTS+=("FAIL  OpenCV-${label}  (build failed)")
      ((FAIL++)) || true
      rm -f "src/assets/opencv/opencv-${version}.min.js"
      continue
    fi

    # ── 5. Check dist output ─────────────────────────────────────────────────
    DIST_FILE="dist/assets/opencv/opencv-${version}.min.js"
    if [[ -f "${DIST_FILE}" ]]; then
      size=$(du -sh "${DIST_FILE}" 2>/dev/null | cut -f1)
      RESULTS+=("PASS  OpenCV-${label}  (dist: ${size})")
      ((PASS++)) || true
    else
      RESULTS+=("FAIL  OpenCV-${label}  (missing from dist: ${DIST_FILE})")
      ((FAIL++)) || true
    fi

    # ── 6. Clean up vendored file ────────────────────────────────────────────
    rm -f "src/assets/opencv/opencv-${version}.min.js"
    rm -f "src/assets/opencv/opencv-${version}.wasm"

    echo ""
  done
done

# =============================================================================
# Run tests and typecheck once (version-independent)
# =============================================================================
echo "──────────────────────────────────────────────"
echo "  Running test suite (version-independent)"
echo "──────────────────────────────────────────────"
if pnpm run test; then
  RESULTS+=("PASS  Tests")
  ((PASS++)) || true
else
  RESULTS+=("FAIL  Tests")
  ((FAIL++)) || true
fi

echo ""
echo "──────────────────────────────────────────────"
echo "  Running typecheck"
echo "──────────────────────────────────────────────"
if pnpm run typecheck; then
  RESULTS+=("PASS  Typecheck")
  ((PASS++)) || true
else
  RESULTS+=("FAIL  Typecheck")
  ((FAIL++)) || true
fi

# =============================================================================
# Results table
# =============================================================================
echo ""
echo "============================================================"
echo "  Results"
echo "============================================================"
for result in "${RESULTS[@]}"; do
  echo "  ${result}"
done
echo ""
echo "  ${PASS} passed, ${FAIL} failed"
echo "============================================================"

if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
