# Zoom RTMS Node.js bindings — WillBooster fork

This fork of [zoom/rtms](https://github.com/zoom/rtms) includes the transcript-only configuration fix described in [upstream issue #133](https://github.com/zoom/rtms/issues/133) and [upstream PR #134](https://github.com/zoom/rtms/pull/134).

Node.js packages and native binaries are distributed through [this repository's GitHub Releases](https://github.com/WillBooster/zoom-rtms/releases). This fork does not publish to npm or PyPI.

## Install

Use the npm-format package asset from a specific release, rather than GitHub's source-code archive:

```json
{
  "dependencies": {
    "@zoom/rtms": "https://github.com/WillBooster/zoom-rtms/releases/download/v1.1.0-wb.2/zoom-rtms-1.1.0-wb.2.tgz"
  },
  "trustedDependencies": ["@zoom/rtms"]
}
```

`trustedDependencies` is needed when using Bun so that the native binary installer runs. Existing `@zoom/rtms` imports continue to work. The package downloads its native binary from this fork and fails installation if the binary cannot be downloaded or loaded.

Supported binary targets are macOS ARM64 and Linux x64 with glibc 2.34 or later. Node.js 22 or later is required; release checks use Node.js 26.13.0 and Bun 1.4.2.

## Development and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for build, verification, and release instructions.

The [upstream documentation](https://zoom.github.io/rtms/) describes the API. The original source and examples remain available in this repository.

## License

The bindings retain the upstream [MIT license](LICENSE.md). Bundled native SDK components retain their original license terms.
