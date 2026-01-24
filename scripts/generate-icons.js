#!/usr/bin/env node

/**
 * Generate app icons from SVG
 * Run: npx sharp-cli assets/icon.svg -o assets/icon.png --resize 1024
 * Or install sharp and run this script: npm install sharp && node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install sharp --save-dev', { stdio: 'inherit' });
  sharp = require('sharp');
}

const assetsDir = path.join(__dirname, '..', 'assets');

async function generateIcons() {
  const svgPath = path.join(assetsDir, 'icon.svg');

  if (!fs.existsSync(svgPath)) {
    console.error('icon.svg not found in assets folder');
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // Generate main icon (1024x1024)
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('Generated icon.png (1024x1024)');

  // Generate adaptive icon (1024x1024)
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('Generated adaptive-icon.png (1024x1024)');

  // Generate splash icon (200x200)
  await sharp(svgBuffer)
    .resize(200, 200)
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('Generated splash-icon.png (200x200)');

  // Generate favicon (48x48)
  await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('Generated favicon.png (48x48)');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
