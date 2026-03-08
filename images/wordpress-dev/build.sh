#!/usr/bin/env bash
set -euo pipefail

# WordPress dev golden image build script.
# Runs inside the VM after the base tangerine.yaml provisioning.
# Adds PHP, Composer, wp-env dependencies, and MariaDB client
# on top of what node-dev provides.

export DEBIAN_FRONTEND=noninteractive

echo "==> Installing pnpm"
npm install -g pnpm

echo "==> Installing Playwright with Chromium"
npx playwright install --with-deps chromium

echo "==> Installing PHP 8.2 + common extensions"
sudo apt-get update -qq
sudo apt-get install -y -qq \
  php8.2 \
  php8.2-cli \
  php8.2-common \
  php8.2-curl \
  php8.2-dom \
  php8.2-gd \
  php8.2-intl \
  php8.2-mbstring \
  php8.2-mysql \
  php8.2-xml \
  php8.2-zip \
  php8.2-bcmath \
  php8.2-imagick \
  php8.2-sqlite3

echo "==> Installing Composer"
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
sudo mv /usr/local/bin/composer /usr/local/bin/composer 2>/dev/null || true

echo "==> Installing MariaDB client"
sudo apt-get install -y -qq mariadb-client

echo "==> Installing wp-env dependencies"
npm install -g @wordpress/env

echo "==> Cleanup"
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

echo "==> Verifying installations"
echo "  php:        $(php --version | head -1)"
echo "  composer:   $(composer --version 2>&1 | head -1)"
echo "  mariadb:    $(mariadb --version)"
echo "  wp-env:     $(npx wp-env --version 2>/dev/null || echo 'installed')"
echo "  pnpm:       $(pnpm --version)"

echo ""
echo "wordpress-dev image build complete."
