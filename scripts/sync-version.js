/**
 * Syncs the version from package.json to tauri.conf.json and backend/Cargo.toml
 * Run this before building: node scripts/sync-version.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = join(__dirname, '..', 'package.json');
const tauriConfPath = join(__dirname, '..', 'backend', 'tauri.conf.json');
const cargoTomlPath = join(__dirname, '..', 'backend', 'Cargo.toml');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

// Sync tauri.conf.json
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
const oldTauriVersion = tauriConf.version;
tauriConf.version = version;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log(`✅ tauri.conf.json: ${oldTauriVersion} → ${version}`);

// Sync Cargo.toml (patch the version line under [package])
let cargoToml = readFileSync(cargoTomlPath, 'utf-8');
const oldCargoVersion = cargoToml.match(/^version = "([^"]+)"/m)?.[1] ?? '?';
cargoToml = cargoToml.replace(/^version = "[^"]+"(\s*#.*)?$/m, `version = "${version}"`);
writeFileSync(cargoTomlPath, cargoToml);
console.log(`✅ Cargo.toml:       ${oldCargoVersion} → ${version}`);
