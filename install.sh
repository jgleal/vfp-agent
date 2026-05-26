#!/usr/bin/env bash
# vfp-agent — installer shim.
#
# Thin wrapper around bin/install.js (the unified Node installer).
# All flags are forwarded as-is.
#
# One-line install:
#   curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash -s -- --only opencode
#
# Update to latest:
#   curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash -s -- --update
#
# Local clone:
#   bash install.sh [flags]

set -euo pipefail

REPO="jgleal/vfp-agent"

if ! command -v node >/dev/null 2>&1; then
  echo "vfp-agent: Node.js (>=18) required. Install:" >&2
  echo "  macOS:  brew install node" >&2
  echo "  Linux:  see https://nodejs.org or use nvm (https://github.com/nvm-sh/nvm)" >&2
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "vfp-agent: Node $NODE_MAJOR too old. Need Node >=18." >&2
  echo "  Upgrade: https://nodejs.org" >&2
  exit 1
fi

# If running from a local clone, use the local installer directly.
# BASH_SOURCE is unset when bash is invoked from stdin (curl | bash) —
# default to empty so the curl-pipe path falls through cleanly.
here="$(cd "$(dirname "${BASH_SOURCE[0]:-}")" 2>/dev/null && pwd)" || here=""
if [ -n "$here" ] && [ -f "$here/bin/install.js" ]; then
  # Reconnect stdin to the terminal so the interactive TUI works when piped (curl | bash).
  if [ -c /dev/tty ]; then
    exec node "$here/bin/install.js" "$@" </dev/tty
  else
    exec node "$here/bin/install.js" "$@"
  fi
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "vfp-agent: npx required (ships with Node >=18). Reinstall Node.js." >&2
  exit 1
fi

# Reconnect stdin to the terminal so the interactive TUI works when piped (curl | bash).
if [ -c /dev/tty ]; then
  exec npx -y "github:$REPO" "$@" </dev/tty
else
  exec npx -y "github:$REPO" "$@"
fi
