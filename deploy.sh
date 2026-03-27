#!/bin/bash
#
# Deploy PiHome Web.
#
# 1. Bump the minor version in src/constants.ts
# 2. Clean previous build output and ../pihome/web/
# 3. Build with Vite
# 4. Copy dist/ into ../pihome/web/
# 5. Commit and push the pihome repo
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIHOME_WEB_DIR="../pihome/web"
VERSION_FILE="src/constants.ts"

cd "$SCRIPT_DIR"

# ── 1. Bump minor version ───────────────────────────────────────────

version=$(grep "APP_VERSION" "$VERSION_FILE" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

if [ -z "$version" ]; then
  echo "❌ Could not read APP_VERSION from $VERSION_FILE"
  exit 1
fi

major=$(echo "$version" | cut -d. -f1)
minor=$(echo "$version" | cut -d. -f2)
patch=$(echo "$version" | cut -d. -f3)

new_minor=$((minor + 1))
new_version="$major.$new_minor.$patch"

sed -i '' "s/APP_VERSION = '[^']*'/APP_VERSION = '$new_version'/" "$VERSION_FILE"
sed -i '' "s/APP_VERSION = \"[^\"]*\"/APP_VERSION = \"$new_version\"/" "$VERSION_FILE"

echo "Version bumped to $new_version"

# ── 2. Clean ─────────────────────────────────────────────────────────

echo "Cleaning..."
rm -rf dist
rm -rf "$PIHOME_WEB_DIR"/*

# ── 3. Build ─────────────────────────────────────────────────────────

echo "Building..."
npm run build

# ── 4. Copy to pihome/web ────────────────────────────────────────────

echo "Copying to $PIHOME_WEB_DIR..."
cp -r dist/* "$PIHOME_WEB_DIR/"

# ── 5. Commit & push pihome ──────────────────────────────────────────

echo "Deploying to pihome repo..."
cd "$PIHOME_WEB_DIR/.."
git add --all
git commit -m "deploy web v$new_version"
git push

cd "$SCRIPT_DIR"
echo "Deployed v$new_version"
