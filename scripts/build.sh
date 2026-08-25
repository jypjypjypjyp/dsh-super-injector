#!/bin/bash
# Build @dsh-external/dsh-super-injector as a self-contained npm package.
#
# Design: junction-link build-time deps from a PREBUILT DSH install (npx cache /
# profile) so the framework's published types are used — no need to build the DSH
# source core, and DSH_CHECKOUT is not required. tsc type-checks + emits .d.ts;
# tsdown bundles the host (self-contained, zero runtime deps) and the client.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ── 1. Locate a prebuilt DSH framework root (has node_modules/@deepseek-ai/dsh-tools) ──
FRAMEWORK=""
for d in "$HOME/.npm/_npx"/*/node_modules "$HOME/.dsh/profiles"/*/node_modules; do
  if [ -d "$d/@deepseek-ai/dsh-tools" ]; then FRAMEWORK="$(dirname "$d")"; break; fi
done
if [ -z "$FRAMEWORK" ]; then
  echo "build: cannot locate a prebuilt DSH install (npx cache / profile) for build deps" >&2
  echo "       hint: run DSH once so its core is installed, or set FRAMEWORK" >&2
  exit 1
fi
FRAMEWORK_NM="$FRAMEWORK/node_modules"
echo "=== DSH framework: $FRAMEWORK ==="

# ── 2. tsc: own devDeps → framework ──
TSC=""
for t in "$ROOT/node_modules/.bin/tsc" "$FRAMEWORK_NM/.bin/tsc"; do
  if [ -x "$t" ] || [ -f "$t.cmd" ]; then TSC="$t"; break; fi
done
if [ -z "$TSC" ]; then echo "build: tsc not found (run pnpm install to get devDeps)" >&2; exit 1; fi

# ── 3. junction-link build-time deps from the prebuilt framework ──
link_pkg() {
  local target="$2"
  if [ ! -e "$target" ]; then echo "build: dep target missing: $target" >&2; exit 1; fi
  node -e "
    const fs = require('fs');
    const path = require('path');
    const link = path.resolve(process.argv[1]);
    const target = path.resolve(process.argv[2]);
    fs.rmSync(link, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  " "node_modules/$1" "$target"
}
mkdir -p node_modules/@deepseek-ai
for spec in "cordis:@deepseek-ai/cordis" "cosmokit:@deepseek-ai/cosmokit" "schemastery:@deepseek-ai/schemastery"; do
  link_pkg "${spec%%:*}" "$FRAMEWORK_NM/${spec#*:}"
done
for p in cordis-plugin-loader dsh-tools dsh-system-prompt; do
  link_pkg "@deepseek-ai/$p" "$FRAMEWORK_NM/@deepseek-ai/$p"
done
# @types/node (tsconfig types:["node"])
if [ ! -e node_modules/@types/node ]; then
  mkdir -p node_modules/@types
  link_pkg "@types/node" "$FRAMEWORK_NM/@types/node"
fi

# ── 4. type-check + emit types ──
echo "=== Compiling src → lib (tsc) ==="
"$TSC" -p tsconfig.json

# ── 5. copy router-core mirror fixture (runtime resolveRouterCore dep) ──
if [ -f src/router-core.fixture.mjs ]; then
  cp src/router-core.fixture.mjs lib/router-core.fixture.mjs
fi

# ── 6. tsdown bundles (host self-contained + client) ──
if [ -x "$ROOT/node_modules/.bin/tsdown" ]; then
  echo "=== Bundling host+client (tsdown) ==="
  "$ROOT/node_modules/.bin/tsdown"
else
  echo "build: tsdown missing; client bundle skipped (pnpm add -D tsdown)" >&2
fi

echo "=== Build complete ==="
ls -la lib/index.js lib/client.js lib/router-core.fixture.mjs 2>/dev/null
