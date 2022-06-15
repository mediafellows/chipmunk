export default {
  '@context': {
    '@id': 'https://um.api.mediastore.dev/v20140601/context/session',
    '@context': 'https://um.api.mediastore.dev/v20140601/context/context',
    '@type': 'context',
    properties:
     { id:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'string' },
       email:
        { readable: false,
          writable: true,
          exportable: false,
          type: 'string' },
       password:
        { readable: false,
          writable: true,
          exportable: false,
          type: 'string' },
       created_at:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'date' },
       updated_at:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'date' },
       fyc_campaign_id:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'number' },
       affiliation:
        { type:
           'https://um.api.mediastore.dev/v20140601/context/affiliation',
          collection: false,
          readable: true,
          writable: false,
          exportable: false },
       user:
        { type: 'https://um.api.mediastore.dev/v20140601/context/user',
          collection: false,
          readable: true,
          writable: false,
          exportable: false },
       organization:
        { type:
           'https://um.api.mediastore.dev/v20140601/context/organization',
          collection: false,
          readable: true,
          writable: false,
          exportable: false },
       role:
        { type: 'https://um.api.mediastore.dev/v20140601/context/role',
          collection: false,
          readable: true,
          writable: false,
          exportable: false },
       powers:
        { type: 'https://um.api.mediastore.dev/v20140601/context/power',
          collection: true,
          readable: true,
          writable: false,
          exportable: false },
       groupings:
        { type: 'https://um.api.mediastore.dev/v20140601/context/group',
          collection: true,
          readable: true,
          writable: false,
          exportable: false },
       protection_checks:
        { type:
           'https://um.api.mediastore.dev/v20140601/context/protection_check',
          collection: true,
          readable: true,
          writable: false,
          exportable: false } },
    constants: {},
    member_actions:
     { create:
        { method: 'POST',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/session',
          response: 'https://um.api.mediastore.dev/v20140601/context/session',
          template: 'https://um.api.mediastore.dev/v20140601/session',
          mappings: [] },
       get:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/session',
          response: 'https://um.api.mediastore.dev/v20140601/context/session',
          template: 'https://um.api.mediastore.dev/v20140601/session',
          mappings: [] },
       full:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/session',
          response: 'https://um.api.mediastore.dev/v20140601/context/session',
          template: 'https://um.api.mediastore.dev/v20140601/session/full',
          mappings: [] },
       delete:
        { method: 'DELETE',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/session',
          response: 'https://um.api.mediastore.dev/v20140601/context/session',
          template: 'https://um.api.mediastore.dev/v20140601/session',
          mappings: [] } },
    collection_actions:
     { impersonate:
        { method: 'POST',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/session',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/session/impersonate',
          mappings: [] } } } }
