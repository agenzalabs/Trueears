/**
 * Syncs the version from package.json to tauri.conf.json
 * Run this before building: node scripts/sync-version.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = join(__dirname, '..', 'package.json');
const tauriConfPath = join(__dirname, '..', 'backend', 'tauri.conf.json');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));

const oldVersion = tauriConf.version;
tauriConf.version = packageJson.version;

writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');

console.log(`✅ Synced version: ${oldVersion} → ${packageJson.version}`);
