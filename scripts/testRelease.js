#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist', 'node');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const files = await readdir(output);
const packages = files.filter(name => name.endsWith('.tgz'));
assert.equal(packages.length, 1, 'Expected exactly one npm-format package');
const temporary = await mkdtemp(join(tmpdir(), 'rtms-release-'));
const requests = [];
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const filename = basename(path);
  requests.push(path);
  if (path.startsWith('/missing/') || !files.includes(filename)) {
    response.writeHead(404).end();
    return;
  }
  createReadStream(join(output, filename)).pipe(response);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const env = {
  ...process.env,
  BUN_INSTALL_CACHE_DIR: join(temporary, 'bun-cache'),
  npm_config_cache: join(temporary, 'npm-cache'),
  npm_config_zoom_rtms_binary_host: `${base}/releases/download`,
};

try {
  const consumer = join(temporary, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({
    name: 'rtms-release-check',
    private: true,
    dependencies: { '@zoom/rtms': `${base}/${packages[0]}` },
    trustedDependencies: ['@zoom/rtms'],
  }));
  await writeFile(join(consumer, 'bunfig.toml'), '[install]\nlinker = "isolated"\n');
  await run('bun', ['install'], consumer, env);
  await checkLoad(consumer, env);
  const assetRequests = requests.filter(path => path.endsWith('.tar.gz'));
  assert(assetRequests.length > 0, 'The installer did not request a native binary');
  assert(assetRequests.every(path => path.startsWith(`/releases/download/v${pkg.version}/`)));

  await rm(join(consumer, 'node_modules'), { recursive: true, force: true });
  await rm(env.BUN_INSTALL_CACHE_DIR, { recursive: true, force: true });
  await rm(env.npm_config_cache, { recursive: true, force: true });
  await run('bun', ['install', '--frozen-lockfile'], consumer, env);
  await checkLoad(consumer, env);

  for (const napi of pkg.binary.napi_versions) {
    const napiConsumer = join(temporary, `napi-${napi}`);
    await mkdir(napiConsumer);
    await writeFile(join(napiConsumer, 'package.json'), await readFile(join(consumer, 'package.json')));
    const napiEnv = {
      ...env,
      BUN_INSTALL_CACHE_DIR: join(temporary, `bun-cache-${napi}`),
      npm_config_target: String(napi),
    };
    await run('bun', ['install'], napiConsumer, napiEnv);
    await checkLoad(napiConsumer, napiEnv);
    assert(requests.some(path => path.endsWith(`-napi-v${napi}-${process.platform}-${process.arch}.tar.gz`)));
  }

  const broken = join(temporary, 'missing-binary');
  await mkdir(broken);
  await writeFile(join(broken, 'package.json'), await readFile(join(consumer, 'package.json')));
  const brokenEnv = {
    ...env,
    BUN_INSTALL_CACHE_DIR: join(temporary, 'missing-bun-cache'),
    npm_config_cache: join(temporary, 'missing-npm-cache'),
    npm_config_zoom_rtms_binary_host: `${base}/missing`,
  };
  await assert.rejects(run('bun', ['install'], broken, brokenEnv), error => {
    assert.notEqual(error.code, 0);
    return true;
  });
  assert(requests.some(path => path.startsWith('/missing/')));
  console.log('Release checks passed: installation, native loading, clean reinstall, and missing-binary failure.');
} catch (error) {
  console.error('Release check requests:', requests);
  throw error;
} finally {
  await new Promise(resolve => server.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}

async function checkLoad(cwd, env) {
  const code = 'const rtms = require("@zoom/rtms").default; if (typeof rtms.Client !== "function") throw new Error("Client export missing"); console.log("native-load-ok");';
  for (const command of ['bun', 'node']) {
    const result = await run(command, ['-e', code], cwd, env);
    assert(result.stdout.includes('native-load-ok'));
  }
  await access(join(cwd, 'node_modules', '@zoom', 'rtms', 'build', 'Release', 'rtms.node'));
}

async function run(command, args, cwd, env) {
  return exec(command, args, { cwd, env, timeout: 120_000, maxBuffer: 10 * 1024 * 1024 });
}
