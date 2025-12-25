#!/bin/bash

# Script to download GeoLite2-City database
# 
# This script downloads the GeoLite2-City.mmdb database from MaxMind.
# You need a MaxMind account and license key to download the database.
# 
# Usage:
# 1. Sign up for a free MaxMind account at https://www.maxmind.com/en/geolite2/signup
# 2. Get your license key from https://www.maxmind.com/en/accounts/current/license-key
# 3. Set MAXMIND_LICENSE_KEY environment variable or create .env file with:
#    MAXMIND_LICENSE_KEY=your_license_key_here
# 4. Run: ./scripts/download-geolite-db.sh
# 
# The database will be downloaded to: backend/data/GeoLite2-City.mmdb

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$BACKEND_DIR/data"
DB_PATH="$DATA_DIR/GeoLite2-City.mmdb"

# Load .env file if it exists
if [ -f "$BACKEND_DIR/.env" ]; then
  export $(cat "$BACKEND_DIR/.env" | grep -v '^#' | xargs)
fi

if [ -z "$MAXMIND_LICENSE_KEY" ]; then
  echo "❌ Error: MAXMIND_LICENSE_KEY environment variable is not set."
  echo ""
  echo "To get a license key:"
  echo "1. Sign up for a free MaxMind account at https://www.maxmind.com/en/geolite2/signup"
  echo "2. Get your license key from https://www.maxmind.com/en/accounts/current/license-key"
  echo "3. Set the environment variable:"
  echo "   export MAXMIND_LICENSE_KEY=your_license_key_here"
  echo "   OR create a .env file in the backend directory with:"
  echo "   MAXMIND_LICENSE_KEY=your_license_key_here"
  echo ""
  echo "Then run this script again."
  exit 1
fi

# Ensure data directory exists
mkdir -p "$DATA_DIR"

echo "📥 Downloading GeoLite2-City database..."
echo "   This may take a few minutes..."

TEMP_FILE="$DATA_DIR/GeoLite2-City.tar.gz"
DOWNLOAD_URL="https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=$MAXMIND_LICENSE_KEY&suffix=tar.gz"

# Download the database
if command -v curl &> /dev/null; then
  curl -L -o "$TEMP_FILE" "$DOWNLOAD_URL"
elif command -v wget &> /dev/null; then
  wget -O "$TEMP_FILE" "$DOWNLOAD_URL"
else
  echo "❌ Error: Neither curl nor wget is installed. Please install one of them."
  exit 1
fi

# Check if download was successful
if [ ! -f "$TEMP_FILE" ] || [ ! -s "$TEMP_FILE" ]; then
  echo "❌ Error: Failed to download database."
  exit 1
fi

echo "✅ Download complete!"
echo "📦 Extracting database..."

# Extract the .mmdb file from the tar.gz
cd "$DATA_DIR"
tar -xzf "$TEMP_FILE" --wildcards "*.mmdb" --strip-components=1

# Move the extracted file to the correct location
if [ -f "GeoLite2-City.mmdb" ]; then
  mv "GeoLite2-City.mmdb" "$DB_PATH"
elif [ -f "GeoLite2-City_*.mmdb" ]; then
  mv GeoLite2-City_*.mmdb "$DB_PATH"
else
  echo "❌ Error: Could not find extracted .mmdb file."
  exit 1
fi

# Clean up temp file
rm -f "$TEMP_FILE"

echo "✅ Database extracted successfully!"
echo "   Location: $DB_PATH"
echo "✅ Cleanup complete!"

