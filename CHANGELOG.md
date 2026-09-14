# Changelog

## Unreleased — next major release

### Compatibility

- Requires Node.js 22.12 or newer; development and CI use Node 22.23.1 and 24.20.0.
- The browser bundle targets ES2020 and requires native `AbortController`, `AbortSignal.any`, `URL`, `Blob`, and `FormData`. Older browsers need application-provided polyfills. CommonJS, declarations, and the existing `window.MFX` and `window.UriTemplate` exports remain available.
- Request URLs must use HTTP(S), contain no embedded credentials, and have an allowed hostname. Allowed hosts are localhost/loopback, the exact `api.mediastore.com`, `api.mediastore.dev`, `api.nbcupassport.com`, and `api.nbcupassport.dev` domains, and their subdomains.
- In Node, redirects may only stay on the initial origin. This prevents custom identity headers reaching another origin, including another allowed host or port. Browser redirects remain subject to browser networking and CORS rules.

### Fixes

- Per-action and client cancellation both apply to metadata, direct requests, proxy requests, and associations. Cancellation is no longer swallowed during association resolution. Independent cancellation scopes no longer share an in-flight metadata request.
- URL validation rejects hostname substring tricks, unsupported protocols, and credentials in URLs.
- Downloads preserve binary data and MIME types, prefer UTF-8 filenames, recognize XLSX responses, and release object URLs and temporary links after success or failure.

### Dependencies and verification

- Upgrade Axios to 1.20.0 and Lodash to 4.18.1; refresh development tooling and transitive dependencies. Pin direct dependencies and commit the Yarn lockfile.
- Add behavioral contracts, real local HTTP tests, and Chromium/Firefox/WebKit coverage. Enforce coverage, type checking, a vulnerability audit, and package-consumer checks locally and in CI.
- Remove the inactive credential-decryption test helper and its direct YAML dependencies. Tests use local fixtures and require no service credentials.

See [the dependency upgrade record](docs/dependency-upgrades.md) for versions, evidence, and remaining limits. These breaking changes require a major version when published; the package version is left for the release process.
