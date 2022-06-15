export default {
  '@context': {
    '@id':
    'https://um.api.mediastore.dev/v20140601/context/user/phone',
    '@context': 'https://um.api.mediastore.dev/v20140601/context/context',
    '@type': 'context',
    properties:
     { sequence_number:
        { readable: true,
          writable: true,
          exportable: true,
          validations:
           [ { numericality: { only_integer: true, allow_nil: true, greater_than: 0 } } ],
          type: 'number' },
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
       id:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'number' },
       user_id:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'number' },
       label:
        { readable: true,
          writable: true,
          exportable: true,
          required: true,
          validations:
           [ { inclusion: { in: [ 'Work', 'Home', 'Mobile', 'Fax' ] } } ],
          type: 'string' },
       number:
        { readable: true,
          writable: true,
          exportable: true,
          required: true,
          validations:
           [ { format:
                { with: '/^[0-9\\(\\)\\+\\-\\.\\ ]{5,}$/',
                  message: 'may contain 0-9, (), +, - and .' } } ],
          type: 'string' },
       user:
        { type: 'https://um.api.mediastore.dev/v20140601/context/user',
          collection: false,
          readable: true,
          writable: false,
          exportable: false } },
    constants: { labels: [ 'Work', 'Home', 'Mobile', 'Fax' ] },
    member_actions:
     { get:
        { method: 'GET',
          expects: null,
          resource:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          response:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/phone/{phone_id}',
          mappings:
           [ { variable: 'user_ids', source: 'user_id', required: true },
             { variable: 'phone_id', source: 'id', required: true } ] },
       update:
        { method: 'PATCH',
          expects:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          resource:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          response:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/phone/{phone_id}',
          mappings:
           [ { variable: 'user_ids', source: 'user_id', required: true },
             { variable: 'phone_id', source: 'id', required: true } ] },
       delete:
        { method: 'DELETE',
          expects: null,
          resource:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          response:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/phone/{phone_id}',
          mappings:
           [ { variable: 'user_ids', source: 'user_id', required: true },
             { variable: 'phone_id', source: 'id', required: true } ] } },
    collection_actions:
     { query:
        { method: 'GET',
          expects: null,
          resource:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/phones{?ids,page,per}',
          mappings:
           [ { variable: 'user_ids', source: 'user_id', required: true },
             { variable: 'ids', source: 'id' },
             { variable: 'page' },
             { variable: 'per' } ] },
       create:
        { method: 'POST',
          expects:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          resource:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          response:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_id}/phones',
          mappings: [ { variable: 'user_id', required: true } ] },
       get:
        { method: 'GET',
          expects: null,
          resource:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/phones/{phone_ids}',
          mappings:
           [ { variable: 'user_ids', source: 'user_id', required: true },
             { variable: 'phone_ids', source: 'id', required: true } ] },
       update:
        { method: 'PATCH',
          expects:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          resource:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/phones/{phone_ids}',
          mappings:
           [ { variable: 'user_ids', source: 'user_id', required: true },
             { variable: 'phone_ids', source: 'id', required: true } ] },
       delete:
        { method: 'DELETE',
          expects: null,
          resource:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/phones/{phone_ids}',
          mappings:
           [ { variable: 'user_ids', source: 'user_id', required: true },
             { variable: 'phone_ids', source: 'id', required: true } ] } },
    action: [Function],
    associations:
     { user:
        { type: 'https://um.api.mediastore.dev/v20140601/context/user',
          collection: false,
          readable: true,
          writable: false,
          exportable: false } } } }
