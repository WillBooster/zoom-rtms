#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const platform = `${process.platform}-${process.arch}`;
const output = join(root, 'dist', 'node');

assert(['darwin-arm64', 'linux-x64'].includes(platform), `Unsupported release platform: ${platform}`);
assert.equal(pkg.repository.url, 'git+https://github.com/WillBooster/zoom-rtms.git');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const napi of pkg.binary.napi_versions) {
  execFileSync('npm', ['exec', '--no', '--', 'cmake-js', 'rebuild', '--CDCMAKE_BUILD_TYPE=Release'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, npm_config_napi_build_version: String(napi) },
  });

  const files = readdirSync(join(root, 'build', 'Release'), { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(?:node|js|dylib|so(?:\.\d+)*|tar\.gz)$/.test(entry.name))
    .map(entry => `build/Release/${entry.name}`);
  assert(files.includes('build/Release/rtms.node'));
  assert(files.includes('build/Release/index.js'));
  const filename = `rtms-v${pkg.version}-napi-v${napi}-${platform}.tar.gz`;
  execFileSync('tar', ['-czf', join(output, filename), '-C', root, ...files], {
    stdio: 'inherit',
    env: { ...process.env, COPYFILE_DISABLE: '1' },
  });
}

execFileSync('npm', ['pack', '--ignore-scripts', '--pack-destination', output], {
  cwd: root,
  stdio: 'inherit',
});
console.log(`Release files written to dist/node for ${platform}.`);
