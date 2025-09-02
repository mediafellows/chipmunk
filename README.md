[![Javascript CI](https://github.com/mediafellows/chipmunk/actions/workflows/javascript.yml/badge.svg)](https://github.com/mediafellows/chipmunk/actions/workflows/javascript.yml)

# Chipmunk

REST API client library for the Mediastore. Successor of [Chinchilla](https://github.com/mediafellows/chinchilla).

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
