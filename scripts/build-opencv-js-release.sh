#!/usr/bin/env bash
# This file is part of @robomous/opencv-react project from Robomous.
# It is subject to the license terms in the LICENSE file found in the top-level directory

# =============================================================================
# build-opencv-js-release.sh
#
# Builds OpenCV.js from an official release tag using Docker + emscripten/emsdk.
# Only official stable release versions are supported (see SUPPORTED_RELEASES).
#
# Usage:
#   bash scripts/build-opencv-js-release.sh --version 4.13.0
#   bash scripts/build-opencv-js-release.sh --version 4.13.0 --with-contrib
#   bash scripts/build-opencv-js-release.sh --version 4.12.0 --docker-image emscripten/emsdk:2.0.10
#   bash scripts/build-opencv-js-release.sh --version 4.10.0 --disable-single-file
#   bash scripts/build-opencv-js-release.sh --version 4.13.0 --build-loader
#   bash scripts/build-opencv-js-release.sh --help
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source helper config (SUPPORTED_RELEASES, validation, naming functions)
# shellcheck source=scripts/helpers/opencv-release-config.sh
source "${SCRIPT_DIR}/helpers/opencv-release-config.sh"

# =============================================================================
# Default configuration — edit this section to change defaults
# =============================================================================
DEFAULT_VERSION="4.13.0"
# DEFAULT_DOCKER_IMAGE is resolved per-version after arg parsing (see get_docker_image() in helper)
DEFAULT_DOCKER_IMAGE=""
DEFAULT_USE_DOCKER="true"
DEFAULT_DISABLE_SINGLE_FILE="false"
DEFAULT_BUILD_LOADER="false"
DEFAULT_WITH_CONTRIB="false"
WORK_ROOT="build/opencv-js"
RELEASES_DIR="${WORK_ROOT}/releases"
CHECKOUTS_DIR="${WORK_ROOT}/checkouts"

# =============================================================================
# Argument parsing
# =============================================================================
VERSION="${DEFAULT_VERSION}"
DOCKER_IMAGE="${DEFAULT_DOCKER_IMAGE}"
USE_DOCKER="${DEFAULT_USE_DOCKER}"
DISABLE_SINGLE_FILE="${DEFAULT_DISABLE_SINGLE_FILE}"
BUILD_LOADER="${DEFAULT_BUILD_LOADER}"
WITH_CONTRIB="${DEFAULT_WITH_CONTRIB}"
OUTPUT_DIR=""

usage() {
  cat <<EOF
Usage: bash scripts/build-opencv-js-release.sh [OPTIONS]

Build OpenCV.js from an official release tag using Docker + emscripten/emsdk.

OPTIONS:
  --version <ver>         OpenCV release version to build (required if not using default)
                          Supported: ${SUPPORTED_RELEASES[*]}
  --with-contrib          Include opencv_contrib modules
  --docker-image <img>    Docker image to use (default: version-specific, see opencv-release-config.sh)
  --disable-single-file   Emit separate opencv.js + opencv.wasm files
  --build-loader          Also build the ES module loader
  --output-dir <dir>      Override the release output directory
  --help                  Show this help message

EXAMPLES:
  bash scripts/build-opencv-js-release.sh --version 4.13.0
  bash scripts/build-opencv-js-release.sh --version 4.13.0 --with-contrib
  bash scripts/build-opencv-js-release.sh --version 4.12.0 --docker-image emscripten/emsdk:2.0.10
  bash scripts/build-opencv-js-release.sh --version 4.10.0 --disable-single-file

OUTPUT:
  build/opencv-js/releases/OpenCV-<version>/
  build/opencv-js/releases/OpenCV-<version>-contrib/   (when --with-contrib)

EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="${2:?'--version requires a value'}"
      shift 2
      ;;
    --with-contrib)
      WITH_CONTRIB="true"
      shift
      ;;
    --docker-image)
      DOCKER_IMAGE="${2:?'--docker-image requires a value'}"
      shift 2
      ;;
    --disable-single-file)
      DISABLE_SINGLE_FILE="true"
      shift
      ;;
    --build-loader)
      BUILD_LOADER="true"
      shift
      ;;
    --output-dir)
      OUTPUT_DIR="${2:?'--output-dir requires a value'}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

# =============================================================================
# Validation
# =============================================================================
validate_version "${VERSION}" "build-opencv-js-release.sh"

# Resolve Docker image: use explicit override, else per-version default
if [[ -z "${DOCKER_IMAGE}" ]]; then
  DOCKER_IMAGE="$(get_docker_image "${VERSION}")"
fi

PACKAGE_NAME="$(get_package_name "${VERSION}" "${WITH_CONTRIB}")"
RELEASE_OUTPUT_DIR="${OUTPUT_DIR:-${REPO_ROOT}/${RELEASES_DIR}/${PACKAGE_NAME}}"
CHECKOUT_DIR="${REPO_ROOT}/${CHECKOUTS_DIR}/${PACKAGE_NAME}"
OPENCV_SRC="${CHECKOUT_DIR}/opencv"
OPENCV_CONTRIB_SRC="${CHECKOUT_DIR}/opencv_contrib"
BUILD_DIR="${CHECKOUT_DIR}/build_js"

# =============================================================================
# Summary
# =============================================================================
echo "============================================================"
echo "  @robomous/opencv-react: Building OpenCV.js"
echo "============================================================"
echo "  Version:             ${VERSION}"
echo "  Package name:        ${PACKAGE_NAME}"
echo "  With contrib:        ${WITH_CONTRIB}"
echo "  Docker image:        ${DOCKER_IMAGE}"
echo "  Disable single file: ${DISABLE_SINGLE_FILE}"
echo "  Build loader:        ${BUILD_LOADER}"
echo "  Output:              ${RELEASE_OUTPUT_DIR}"
echo "============================================================"
echo ""

# =============================================================================
# Ensure required tools are available
# =============================================================================
if [[ "${USE_DOCKER}" == "true" ]]; then
  if ! command -v docker &>/dev/null; then
    echo "ERROR: Docker is required but not found in PATH." >&2
    echo "Install Docker: https://docs.docker.com/get-docker/" >&2
    exit 1
  fi
fi

if ! command -v git &>/dev/null; then
  echo "ERROR: git is required but not found in PATH." >&2
  exit 1
fi

# =============================================================================
# Prepare directories
# =============================================================================
mkdir -p "${CHECKOUT_DIR}"
mkdir -p "${RELEASE_OUTPUT_DIR}"

# =============================================================================
# Clone OpenCV source (shallow, release tag only)
# =============================================================================
if [[ -d "${OPENCV_SRC}/.git" ]]; then
  echo "→ Using existing OpenCV checkout at ${OPENCV_SRC}"
else
  echo "→ Cloning OpenCV ${VERSION} (shallow)..."
  CLONE_CMD="$(build_opencv_clone_cmd "${VERSION}" "${OPENCV_SRC}")"
  echo "  ${CLONE_CMD}"
  eval "${CLONE_CMD}"
fi

CONTRIB_CLONE_CMD=""
if [[ "${WITH_CONTRIB}" == "true" ]]; then
  if [[ -d "${OPENCV_CONTRIB_SRC}/.git" ]]; then
    echo "→ Using existing opencv_contrib checkout at ${OPENCV_CONTRIB_SRC}"
  else
    echo "→ Cloning opencv_contrib ${VERSION} (shallow)..."
    CONTRIB_CLONE_CMD="$(build_contrib_clone_cmd "${VERSION}" "${OPENCV_CONTRIB_SRC}")"
    echo "  ${CONTRIB_CLONE_CMD}"
    eval "${CONTRIB_CLONE_CMD}"
  fi
fi

# =============================================================================
# Build OpenCV.js options
# =============================================================================
BUILD_OPTS=""

if [[ "${DISABLE_SINGLE_FILE}" == "true" ]]; then
  BUILD_OPTS="${BUILD_OPTS} --disable_single_file"
fi

if [[ "${BUILD_LOADER}" == "true" ]]; then
  BUILD_OPTS="${BUILD_OPTS} --build_loader"
fi

if [[ "${WITH_CONTRIB}" == "true" ]]; then
  BUILD_OPTS="${BUILD_OPTS} --cmake_option=\"-DOPENCV_EXTRA_MODULES_PATH=/src/opencv_contrib/modules\""
fi

# =============================================================================
# Construct and run the Docker build command
# =============================================================================
echo ""
echo "→ Building OpenCV.js with Docker..."

# Map checkout dir into Docker as /src so paths are consistent.
# -w /src sets the working directory so build_js.py writes output to /src/build_js/
DOCKER_CMD="docker run --rm \
  -v \"${CHECKOUT_DIR}\":/src \
  -w /src \
  -u \"$(id -u):$(id -g)\" \
  ${DOCKER_IMAGE} \
  emcmake python3 /src/opencv/platforms/js/build_js.py build_js ${BUILD_OPTS}"

echo "  ${DOCKER_CMD}"
echo ""

eval "${DOCKER_CMD}"

# =============================================================================
# Copy artifacts to release output directory
# =============================================================================
echo ""
echo "→ Copying artifacts to ${RELEASE_OUTPUT_DIR}..."

BUILT_DIR="${BUILD_DIR}/bin"

if [[ ! -f "${BUILT_DIR}/opencv.js" ]]; then
  echo "ERROR: Expected built opencv.js at ${BUILT_DIR}/opencv.js" >&2
  echo "Check the build output above for errors." >&2
  exit 1
fi

cp "${BUILT_DIR}/opencv.js" "${RELEASE_OUTPUT_DIR}/opencv.js"

if [[ "${DISABLE_SINGLE_FILE}" == "true" && -f "${BUILT_DIR}/opencv.wasm" ]]; then
  cp "${BUILT_DIR}/opencv.wasm" "${RELEASE_OUTPUT_DIR}/opencv.wasm"
  echo "  Copied opencv.js + opencv.wasm"
else
  echo "  Copied opencv.js"
fi

if [[ "${BUILD_LOADER}" == "true" && -f "${BUILT_DIR}/opencv_js_loader.js" ]]; then
  cp "${BUILT_DIR}/opencv_js_loader.js" "${RELEASE_OUTPUT_DIR}/opencv_js_loader.js"
  echo "  Copied opencv_js_loader.js"
fi

# =============================================================================
# Generate metadata files
# =============================================================================
BUILD_DATE="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

cat > "${RELEASE_OUTPUT_DIR}/BUILD_INFO.txt" <<EOF
OpenCV.js Build Information
===========================
OpenCV Version:       ${VERSION}
Package Name:         ${PACKAGE_NAME}
With Contrib:         ${WITH_CONTRIB}
Docker Mode:          ${USE_DOCKER}
Docker Image:         ${DOCKER_IMAGE}
Disable Single File:  ${DISABLE_SINGLE_FILE}
Build Loader:         ${BUILD_LOADER}
Build Date (UTC):     ${BUILD_DATE}
EOF

OPENCV_CLONE_CMD_FULL="$(build_opencv_clone_cmd "${VERSION}" "<dest>")"

cat > "${RELEASE_OUTPUT_DIR}/SOURCE_INFO.txt" <<EOF
OpenCV.js Source Information
============================
OpenCV Repository:    ${OPENCV_REPO_URL}
OpenCV Version:       ${VERSION}
Clone Command:        ${OPENCV_CLONE_CMD_FULL}
EOF

if [[ "${WITH_CONTRIB}" == "true" ]]; then
  CONTRIB_CLONE_CMD_FULL="$(build_contrib_clone_cmd "${VERSION}" "<dest>")"
  cat >> "${RELEASE_OUTPUT_DIR}/SOURCE_INFO.txt" <<EOF
Contrib Repository:   ${OPENCV_CONTRIB_REPO_URL}
Contrib Clone Cmd:    ${CONTRIB_CLONE_CMD_FULL}
EOF
fi

cat >> "${RELEASE_OUTPUT_DIR}/SOURCE_INFO.txt" <<EOF

Build Command:
  ${DOCKER_CMD}
EOF

# =============================================================================
# Done
# =============================================================================
echo ""
echo "============================================================"
echo "  Build complete!"
echo "  Output: ${RELEASE_OUTPUT_DIR}"
echo "============================================================"
echo ""
echo "Next steps:"
echo "  pnpm run vendor:opencv --version ${VERSION}$([ "${WITH_CONTRIB}" = "true" ] && echo " --with-contrib" || echo "")"
echo "  pnpm run verify:opencv"
