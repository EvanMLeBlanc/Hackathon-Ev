'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildTeamsAppManifest, getTeamsAppConfig } = require('../src/teamsAppManifest');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'teams-app', 'assets');
const outputDir = path.join(rootDir, 'dist', 'teams-app-package');
const outputZipPath = path.join(rootDir, 'dist', 'teams-app-package.zip');

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name);
    const dataBuffer = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const localHeader = Buffer.alloc(30);
    const centralHeader = Buffer.alloc(46);
    const checksum = crc32(dataBuffer);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(dataBuffer.length, 18);
    localHeader.writeUInt32LE(dataBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(dataBuffer.length, 20);
    centralHeader.writeUInt32LE(dataBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    localParts.push(localHeader, nameBuffer, dataBuffer);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + dataBuffer.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function copyAsset(filename) {
  const sourcePath = path.join(assetsDir, filename);
  const destinationPath = path.join(outputDir, filename);
  fs.copyFileSync(sourcePath, destinationPath);
  return destinationPath;
}

function buildPackage() {
  ensureDirectory(outputDir);

  const manifest = buildTeamsAppManifest(getTeamsAppConfig(process.env));
  const manifestPath = path.join(outputDir, 'manifest.json');

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const colorIconPath = copyAsset('color.png');
  const outlineIconPath = copyAsset('outline.png');

  const zipBuffer = createStoredZip([
    {
      name: 'manifest.json',
      data: fs.readFileSync(manifestPath)
    },
    {
      name: 'color.png',
      data: fs.readFileSync(colorIconPath)
    },
    {
      name: 'outline.png',
      data: fs.readFileSync(outlineIconPath)
    }
  ]);

  fs.writeFileSync(outputZipPath, zipBuffer);

  return {
    manifestPath,
    outputZipPath
  };
}

if (require.main === module) {
  const result = buildPackage();
  process.stdout.write(`Created Teams app package:\n- ${result.manifestPath}\n- ${result.outputZipPath}\n`);
}

module.exports = {
  buildPackage,
  createStoredZip,
  crc32
};
