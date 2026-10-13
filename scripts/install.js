#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tar from 'tar';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(root, 'build', 'Release');
const development = existsSync(join(root, '.git'));

if (!development || process.argv.includes('--force')) {
  try {
    execFileSync(process.execPath, [require.resolve('prebuild-install/bin.js'), '-r', 'napi'], {
      cwd: root,
      stdio: 'inherit',
    });

    if (process.platform === 'darwin') {
      for (const archive of readdirSync(buildDir).filter(name => !name.startsWith('.') && name.endsWith('.framework.tar.gz'))) {
        const path = join(buildDir, archive);
        tar.extract({ file: path, cwd: buildDir, sync: true });
        unlinkSync(path);
      }
    }

    if (!existsSync(join(buildDir, 'index.js'))) {
      throw new Error('The release archive does not contain build/Release/index.js');
    }
    require(join(buildDir, 'rtms.node'));
    console.log('[RTMS Install] Native module installed and loaded successfully.');
  } catch (error) {
    console.error(`[RTMS Install] ${error.message}`);
    console.error('Install a release that includes a binary for this platform and Node-API version.');
    process.exitCode = 1;
  }
}
