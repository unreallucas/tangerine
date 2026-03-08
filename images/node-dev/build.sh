#!/usr/bin/env bash
set -euo pipefail

# Node.js baseline golden image build script.
# Runs inside the VM after the base tangerine.yaml provisioning.
# Adds Playwright + Chromium and pnpm on top of the base image.

echo "==> Installing pnpm"
npm install -g pnpm

echo "==> Installing Playwright with Chromium"
npx playwright install --with-deps chromium

echo "==> Verifying installations"
echo "  pnpm:       $(pnpm --version)"
echo "  playwright:  $(npx playwright --version)"

echo ""
echo "node-dev image build complete."
