# Contributing

## Build and verify

Use Node.js 26.13.0, Bun 1.4.2, CMake 3.25.1 or later, and a C++20 compiler. Native release builds support macOS ARM64 and Linux x64.

```sh
npm ci --ignore-scripts
node scripts/check-deps.js
cmake -B build/tests -DRTMS_BUILD_TESTS=ON -DCMAKE_BUILD_TYPE=Debug
cmake --build build/tests --target rtms_tests --parallel 4
ctest --test-dir build/tests --output-on-failure
npm run release:pack
npm exec --no -- jest tests/ts/rtms.test.ts tests/ts/rtms.wrapper.test.ts
npm run release:test
```

`release:pack` builds both configured Node-API versions and creates native archives plus an npm-format package in `dist/node`. `release:test` installs that package through Bun, verifies native loading through Bun and Node.js, and checks that a missing binary makes installation fail.

## Release

Update the version in `package.json` and `package-lock.json` before releasing. Keep `repository.url` pointed at `WillBooster/zoom-rtms`; the installer uses it to locate native binaries.

After the changes are merged to `main`, manually run **Publish Node.js Release** from this repository's Actions tab. It builds and tests both supported platforms before creating a prerelease tagged `v<version>` in `WillBooster/zoom-rtms`. Existing release tags must not be reused.

Publishing requires only this repository's GitHub token. npm and PyPI publishing are disabled. Legacy `scripts/publish.js` commands exit with an error.

## Pull requests

Use a descriptive Conventional Commits title, explain the behavior changed, and report the checks actually performed. Preserve the upstream copyright and license notices.
