/**
 * Script to download GeoLite2-City database
 * 
 * This script downloads the GeoLite2-City.mmdb database from MaxMind.
 * You need a MaxMind account and license key to download the database.
 * 
 * Usage:
 * 1. Sign up for a free MaxMind account at https://www.maxmind.com/en/geolite2/signup
 * 2. Get your license key from https://www.maxmind.com/en/accounts/current/license-key
 * 3. Set MAXMIND_LICENSE_KEY environment variable or create .env file with:
 *    MAXMIND_LICENSE_KEY=your_license_key_here
 * 4. Run: node scripts/download-geolite-db.js
 * 
 * The database will be downloaded to: backend/data/GeoLite2-City.mmdb
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAXMIND_LICENSE_KEY = process.env.MAXMIND_LICENSE_KEY || process.env.MAXMIND_LICENSE_KEY_FILE;
const DOWNLOAD_URL = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz`;
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'GeoLite2-City.mmdb');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!MAXMIND_LICENSE_KEY) {
  console.error('❌ Error: MAXMIND_LICENSE_KEY environment variable is not set.');
  console.error('');
  console.error('To get a license key:');
  console.error('1. Sign up for a free MaxMind account at https://www.maxmind.com/en/geolite2/signup');
  console.error('2. Get your license key from https://www.maxmind.com/en/accounts/current/license-key');
  console.error('3. Set the environment variable:');
  console.error('   export MAXMIND_LICENSE_KEY=your_license_key_here');
  console.error('   OR create a .env file in the backend directory with:');
  console.error('   MAXMIND_LICENSE_KEY=your_license_key_here');
  console.error('');
  console.error('Then run this script again.');
  process.exit(1);
}

console.log('📥 Downloading GeoLite2-City database...');
console.log('   This may take a few minutes...');

const tempFile = path.join(DATA_DIR, 'GeoLite2-City.tar.gz');

https.get(DOWNLOAD_URL, (response) => {
  if (response.statusCode === 401) {
    console.error('❌ Error: Invalid license key. Please check your MAXMIND_LICENSE_KEY.');
    process.exit(1);
  }
  
  if (response.statusCode !== 200) {
    console.error(`❌ Error: Failed to download database. Status code: ${response.statusCode}`);
    process.exit(1);
  }

  const totalSize = parseInt(response.headers['content-length'] || '0', 10);
  let downloadedSize = 0;

  const fileStream = fs.createWriteStream(tempFile);
  
  response.on('data', (chunk) => {
    downloadedSize += chunk.length;
    if (totalSize > 0) {
      const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
    }
  });

  response.on('end', () => {
    console.log('\n✅ Download complete!');
    console.log('📦 Extracting database...');
    
    // Extract the .mmdb file from the tar.gz
    // Note: This requires the 'tar' npm package. Install it with: npm install tar
    // Alternatively, use the shell script version which uses system tar command
    
    try {
      const tar = require('tar');
      const gunzip = zlib.createGunzip();
      const extractStream = tar.extract({
        cwd: DATA_DIR,
        filter: (path) => path.endsWith('.mmdb'),
      });

      extractStream.on('entry', (entry) => {
        if (entry.path.endsWith('.mmdb')) {
          const writeStream = fs.createWriteStream(DB_PATH);
          entry.pipe(writeStream);
          writeStream.on('close', () => {
            console.log('✅ Database extracted successfully!');
            console.log(`   Location: ${DB_PATH}`);
            
            // Clean up temp file
            fs.unlinkSync(tempFile);
            console.log('✅ Cleanup complete!');
          });
        }
      });

      fs.createReadStream(tempFile)
        .pipe(gunzip)
        .pipe(extractStream);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        console.error('❌ Error: "tar" package is not installed.');
        console.error('   Please install it with: npm install tar');
        console.error('   OR use the shell script version: ./scripts/download-geolite-db.sh');
        process.exit(1);
      } else {
        throw error;
      }
    }
  });

  response.pipe(fileStream);
}).on('error', (error) => {
  console.error('❌ Error downloading database:', error.message);
  process.exit(1);
});

