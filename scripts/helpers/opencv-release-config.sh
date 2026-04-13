#!/usr/bin/env bash
# This file is part of @robomous/opencv-js-react project from Robomous.
# It is subject to the license terms in the LICENSE file found in the top-level directory

# Helper configuration for the OpenCV.js release build workflow.
# Sourced by scripts/build-opencv-js-release.sh.

# ─── Supported release versions ──────────────────────────────────────────────
# Only official stable releases are allowed. Add new versions here when ready.
SUPPORTED_RELEASES=(
  "4.10.0"
  "4.11.0"
  "4.12.0"
  "4.13.0"
)

# ─── Official repository URLs ────────────────────────────────────────────────
OPENCV_REPO_URL="https://github.com/opencv/opencv.git"
OPENCV_CONTRIB_REPO_URL="https://github.com/opencv/opencv_contrib.git"

# ─── Version-specific Docker image defaults ──────────────────────────────────
# Emscripten 3.1.65+ requires C++17 for embind.  To keep compatibility across
# all supported OpenCV releases, we pin to 3.1.54 which is the last stable
# release before the C++17 embind requirement was introduced and is verified
# to build all supported OpenCV versions correctly.
#
# To override, pass --docker-image <img> on the command line.
OPENCV_DEFAULT_DOCKER_IMAGE="emscripten/emsdk:3.1.54"

# Returns the recommended Docker image for the given OpenCV version.
get_docker_image() {
  local version="$1"
  case "${version}" in
    4.10.0) echo "emscripten/emsdk:3.1.54" ;;
    4.11.0) echo "emscripten/emsdk:3.1.54" ;;
    4.12.0) echo "emscripten/emsdk:3.1.54" ;;
    4.13.0) echo "emscripten/emsdk:3.1.54" ;;
    *)      echo "emscripten/emsdk" ;;
  esac
}

# ─── Validation helpers ──────────────────────────────────────────────────────

# Returns 0 if VERSION is in the SUPPORTED_RELEASES list, 1 otherwise.
is_supported_version() {
  local version="$1"
  for v in "${SUPPORTED_RELEASES[@]}"; do
    if [[ "$v" == "$version" ]]; then
      return 0
    fi
  done
  return 1
}

# Validates a version string and exits with an error if invalid.
# Rejects: blank, branch names, SHAs, non-allowlisted versions.
validate_version() {
  local version="$1"
  local script_name="${2:-build-opencv-js-release.sh}"

  if [[ -z "$version" ]]; then
    echo "ERROR: --version is required." >&2
    echo "Supported releases: ${SUPPORTED_RELEASES[*]}" >&2
    exit 1
  fi

  # Reject obvious branch-like names
  if [[ "$version" == "main" || "$version" == "master" || "$version" == "HEAD" ]]; then
    echo "ERROR: '$version' is a branch name, not a release version." >&2
    echo "Only official release versions are supported." >&2
    exit 1
  fi

  # Reject SHA-like strings (40-char hex or short hex >= 7 chars with no dots)
  if [[ "$version" =~ ^[0-9a-f]{7,40}$ ]]; then
    echo "ERROR: '$version' looks like a commit SHA. Only release versions are supported." >&2
    exit 1
  fi

  # Must match semver pattern x.y.z
  if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "ERROR: '$version' is not a valid semver release version (expected x.y.z)." >&2
    exit 1
  fi

  if ! is_supported_version "$version"; then
    echo "ERROR: OpenCV version '$version' is not in the supported release list." >&2
    echo "Supported releases: ${SUPPORTED_RELEASES[*]}" >&2
    echo "To add support for a new release, update SUPPORTED_RELEASES in scripts/helpers/opencv-release-config.sh" >&2
    exit 1
  fi
}

# ─── Naming helpers ──────────────────────────────────────────────────────────

# Returns the package name for the given version and contrib flag.
# Usage: get_package_name "4.13.0" "true"  → "OpenCV-4.13.0-contrib"
# Usage: get_package_name "4.13.0" "false" → "OpenCV-4.13.0"
get_package_name() {
  local version="$1"
  local with_contrib="${2:-false}"

  if [[ "$with_contrib" == "true" ]]; then
    echo "OpenCV-${version}-contrib"
  else
    echo "OpenCV-${version}"
  fi
}

# ─── Clone command helpers ────────────────────────────────────────────────────

# Prints the shallow clone command for opencv.
build_opencv_clone_cmd() {
  local version="$1"
  local dest="$2"
  echo "git clone --branch ${version} --depth 1 --single-branch ${OPENCV_REPO_URL} ${dest}"
}

# Prints the shallow clone command for opencv_contrib.
build_contrib_clone_cmd() {
  local version="$1"
  local dest="$2"
  echo "git clone --branch ${version} --depth 1 --single-branch ${OPENCV_CONTRIB_REPO_URL} ${dest}"
}
