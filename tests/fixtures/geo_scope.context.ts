export default {
  '@context': {
    '@id': 'https://um.api.mediastore.dev/v20140601/context/geo_scope',
    '@context': 'https://um.api.mediastore.dev/v20140601/context/context',
    '@type': 'context',
    properties:
     { id:
        { readable: true,
          writable: true,
          exportable: true,
          validations:
           [ { length: { is: 3 } },
             { format: { with: '/^[A-Z]+$/' } },
             { uniqueness: { scope: 'affiliation_id' } } ],
          type: 'string' },
       eu_vat_member:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'boolean' },
       former:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'boolean' },
       iso_3166:
        { readable: true,
          writable: true,
          exportable: true,
          validations:
           [ { length: { in: '2..4', allow_nil: true } },
             { format: { with: '/^[A-Z]+$/', allow_nil: true } },
             { uniqueness: { scope: 'affiliation_id', allow_nil: true } } ],
          type: 'string' },
       name:
        { readable: true,
          writable: true,
          exportable: true,
          validations:
           [ { length: { within: '2..255' } },
             { uniqueness: { scope: 'affiliation_id' } } ],
          type: 'string' },
       number:
        { readable: true,
          writable: true,
          exportable: true,
          validations:
           [ { numericality:
                { only_integer: true,
                  allow_nil: true,
                  less_than: 1000,
                  greater_than: 0 } } ],
          type: 'number' },
       parent_id:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'string' },
       ancestry:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'string' } },
    constants: {},
    member_actions:
     { get:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/geo_scope',
          response: 'https://um.api.mediastore.dev/v20140601/context/geo_scope',
          template:
           'https://um.api.mediastore.dev/v20140601/geo_scope/{geography_id}',
          mappings:
           [ { variable: 'geography_id', source: 'id', required: true } ] } },
    collection_actions:
     { query:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/geo_scope',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template: 'https://um.api.mediastore.dev/v20140601/geo_scopes{?ids}',
          mappings: [ { variable: 'ids', source: 'id' } ] },
       graph:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/geo_scope',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template: 'https://um.api.mediastore.dev/v20140601/geo_scopes/graph',
          mappings: [] },
       countries:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/geo_scope',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/geo_scopes/countries{?ids}',
          mappings: [ { variable: 'ids', source: 'id' } ] },
       get:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/geo_scope',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/geo_scopes/{geography_ids}',
          mappings:
           [ { variable: 'geography_ids', source: 'id', required: true } ] } },
    action: [Function],
    associations: {} } }
