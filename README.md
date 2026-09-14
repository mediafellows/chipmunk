[![Javascript CI](https://github.com/mediafellows/chipmunk/actions/workflows/javascript.yml/badge.svg)](https://github.com/mediafellows/chipmunk/actions/workflows/javascript.yml)

# Chipmunk

REST API client library for the Mediastore. Successor of [Chinchilla](https://github.com/mediafellows/chinchilla).

## Development and verification

Use Node.js 22.12+ and Yarn 1.22.22. `.nvmrc` pins the development version; CI also checks Node 24. The browser bundle requires ES2020 and native `AbortSignal.any` (or application-provided polyfills).

```sh
nvm use
yarn install --frozen-lockfile --ignore-scripts --non-interactive
make test              # Type checking, unit tests, coverage gate, audit-parser tests
make build             # CommonJS, declarations, production browser bundle
make integration-test  # Build, real local HTTP, Chromium, Firefox, WebKit
make audit             # Audit runtime and development dependencies; fail on any advisory
make release           # All checks above plus a local package-consumer smoke test
```

`make release` creates a tarball in `.artifacts/`; it does not publish. Tests use local fixtures and need no MediaStore credentials. Run Make targets without `-j`, because build and integration checks share generated outputs.

Browser tests use Playwright 1.59.1. In the MFX development environment, use the existing remote browser server:

```sh
PLAYWRIGHT_WS_ENDPOINT=ws://127.0.0.1:8115/ make integration-test
PLAYWRIGHT_WS_ENDPOINT=ws://127.0.0.1:8115/ make release
```

The client and browser server versions must match. Loopback network forwarding lets the remote browsers reach the local test server. CI runs in `mcr.microsoft.com/playwright:v1.59.1-noble`, with matching browsers already present. On other machines, provide matching Playwright browsers or a matching server.

Coverage reports are in `coverage/`; machine-readable unit, HTTP, browser, and audit results are in `.artifacts/`. Browser failure traces are in `test-results/`. `yarn test` runs the faster unit suite; `make test` also enforces coverage and types. See [the upgrade record](docs/dependency-upgrades.md) and [unreleased compatibility changes](CHANGELOG.md).

## main goals

* slim & simple compared to _chinchilla_
* better suited for react apps
* functional with hopefully no memory leaks
* tested

## interface

### setup, run blocks (always use run blocks!)

```javascript
const chipmunk = createChipmunk({
  errorInterceptor: (err) => true,
  headers: { 'Affiliation-Id': 'mpx' }
})

// to change config
chipmunk.updateConfig({ headers: { 'Session-Id': '345dfgsdfgw43..' } })

chipmunk.run(async (ch) => {
  // requests.. e.g.
  await ch.context('um.user')

  // an error happens
  throw new Error('foo')
}, (err) => {
  // error handler is optional
  console.log(err.message) // would print 'foo'
})

```

### optional configuration options

*verbose mode*

```javascript
ch.updateConfig({ verbose: true })
```

### contexts

```javascript
// get context
await ch.context('um.user')
```

### JSON schemas (mm3 models)

```javascript
// get context
await ch.spec('mm3:pm.product')
```

### actions

#### examples

```javascript
// get user, default method
await ch.action('um.user', 'get', { params: { user_id: 3 } })

// get mm3 product
await ch.action('mm3:pm.product', 'get', { params: { product_ids: 5 } })
```

```javascript
// get user with associations resolved & limited attribute set
await ch.action('um.user', 'get', {
  params: { user_id: 3 },
  schema: `
    id, first_name,
    organization { name },
  `
})
```

```javascript
// get user with associations resolved & limited attribute set
// proxied through tuco (node server) -> only one request, better performance
// will throw if no schema was provided
await ch.action('um.user', 'get', {
  params: { user_id: 3 },
  proxy: true,
  schema: `
    id, first_name,
    organization { name },
  `
})
```

```javascript
// create new user
await ch.action('um.user', 'create', {
  body: {
    first_name: 'john',
    last_name: 'doe',
    ...rest,
  }
})
```

```javascript
// update existing user
await ch.action('um.user', 'update', {
  params: { user_id: 3 },
  body: {
    first_name: 'johnny',
  }
})

// update existing users
await ch.action('um.user', 'update', {
  body: [
    { id: 3, first_name: 'johnny' },
    { id: 5, first_name: 'hermine' },
  ]
})
```

#### optional action options

```javascript
// convert to Ruby on Rails compatible 'accepts nested attributes' body
await ch.action('um.user', 'update', {
  params: { user_id: 3 },
  ROR: true,
  body: {
    first_name: 'johnny',
    organization: {
      name: 'walker'
    }
  }
})
// => converts to
// {
//   first_name: 'johnny',
//   organization_attributes: {
//     name: 'walker'
//   }
// }

// convert to 'multi' update format body (our backends support)
await ch.action('um.user', 'update', {
  multi: true,
  body: [
    { id: 3, first_name: 'johnny' },
    { id: 5, first_name: 'hermine' },
  ]
})
// converts to:
// {
//   '3': { id: 3, first_name: 'johnny' },
//   '5': { id: 5, first_name: 'hermine' },
// }

// return RAW results
// this does not move association references nor does it support resolving a schema
await ch.action('um.user', 'query', {
  raw: true,
})
```

### cache

by default, chipmunk prefixes all cache keys with
- affiliation-id and role-id, if present
- role-id only, if present
- session-id only, if present
- 'anonymous', if none of the above

```javascript
// use 'runtime' cache
ch.updateConfig({ cache: { enabled: true, engine: 'runtime' } })

// use 'storage' cache
ch.updateConfig({ cache: { enabled: true, engine: 'storage' } })

// EXAMPLE 1, write to cache for current user role
ch.updateConfig({ headers: { 'Role-Id': 5 }, cache: { enabled: true, engine: 'storage' } })
ch.cache.set('foo', 'bar')
ch.cache.get('foo') // => bar

ch.updateConfig({ headers: { 'Role-Id': 8 } })
ch.cache.get('foo') // => null

// EXAMPLE 2, write to cache, ignoring session id, role or affiliation, using runtime cache
ch.updateConfig({ headers: { 'Role-Id': 5 } })
ch.cache.set('foo', 'bar', { noPrefix: true, engine: 'runtime' })
ch.cache.get('foo', { noPrefix: true, engine: 'runtime' }) // => bar
ch.cache.get('foo', { engine: 'runtime' }) // => null

ch.updateConfig({ headers: { 'Role-Id': 8 } })
ch.cache.get('foo', { noPrefix: true, engine: 'runtime' }) // => bar
```

### 'perform later' jobs

chipmunk (as chinchilla did previously) offers convenience functionality to run second level priority code after the important stuff has been processed.
this allows for example to lazy load less important data after all important data has been gathered.

an example:

```javascript
const notImportant = () => {
  console.log('this really was not that important')
}

ch.performLater(notImportant)

const users = (await ch.action('um.user', 'query')).objects
console.log(users)

// => [user1, user2, ...]
// => this really was not that important
```
