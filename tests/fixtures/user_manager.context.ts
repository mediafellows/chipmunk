export default {
  '@context': {
    '@id': 'https://um.api.mediastore.dev/v20140601/context/user/manager',
    '@context': 'https://um.api.mediastore.dev/v20140601/context/context',
    '@type': 'context',
    properties:
     { id:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'number' },
       access_level:
        { readable: true,
          writable: true,
          exportable: true,
          required: true,
          validations: [ { inclusion: { in: [ 'company', 'viewable' ] } } ],
          type: 'string' },
       organization_id:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'number' },
       role_id:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'number' },
       responsible_user_id:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'number' },
       geo_scope_ids:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'array' },
       group_ids:
        { readable: false,
          writable: true,
          exportable: true,
          type: 'array' },
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
       approved_at:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'date' },
       invited_at:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'date' },
       activated_at:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'date' },
       blocked_at:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'date' },
       deleted_at:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'date' },
       authenticatable:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'boolean' },
       status:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'string' },
       login_count:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'number' },
       last_login_at:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'date' },
       current_ip:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'string' },
       password_reset_at:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'date' },
       terms_accepted_at:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'date' },
       terms_accepted:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'boolean' },
       country_id:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'string' },
       accessor_group_ids:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'array' },
       analytics_subscription:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'boolean' },
       supervisor_analytics_subscription:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'boolean' },
       email:
        { readable: true,
          writable: true,
          exportable: true,
          required: true,
          validations:
           [ { email: true },
             { uniqueness: { scope: 'affiliation_id', case_sensitive: false } } ],
          type: 'string' },
       tags:
        { readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { maximum: 50 } } ],
          type: 'array' },
       external_reference:
        { readable: true,
          writable: true,
          exportable: true,
          validations:
           [ { uniqueness: { scope: 'affiliation_id', allow_blank: true } } ],
          type: 'string' },
       division_id:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'number' },
       analytics_playback_attachment_all:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'boolean' },
       supervisor_analytics_playback_attachment:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'boolean' },
       supervisor_analytics_playback_attachment_all:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'boolean' },
       first_name:
        { readable: true,
          writable: true,
          exportable: true,
          required: true,
          validations: [ { length: { in: '2..32' } } ],
          type: 'string' },
       last_name:
        { readable: true,
          writable: true,
          exportable: true,
          required: true,
          validations: [ { length: { in: '2..32' } } ],
          type: 'string' },
       middle_name:
        { readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { in: '2..32', allow_blank: true } } ],
          type: 'string' },
       gender:
        { readable: true,
          writable: true,
          exportable: true,
          validations:
           [ { inclusion: { in: [ 'Male', 'Female' ], allow_blank: true } } ],
          type: 'string' },
       title:
        { readable: true,
          writable: true,
          exportable: true,
          validations:
           [ { inclusion: { in: [ 'PhD', 'Prof' ], allow_blank: true } } ],
          type: 'string' },
       department:
        { readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { in: '2..128', allow_blank: true } } ],
          type: 'string' },
       assistant:
        { readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { in: '2..64', allow_blank: true } } ],
          type: 'string' },
       function:
        { readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { in: '2..128', allow_blank: true } } ],
          type: 'string' },
       website:
        { readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { in: '2..255', allow_blank: true } } ],
          type: 'string' },
       fax:
        { readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { in: '2..255', allow_blank: true } } ],
          type: 'string' },
       date_of_birth:
        { readable: true, writable: true, exportable: true, type: 'date' },
       mobile_sync:
        { readable: true,
          writable: false,
          exportable: true,
          type: 'boolean' },
       notes:
        { readable: true, writable: true, exportable: true, type: 'text' },
       preview_image_id:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'number' },
       customer_segment:
        { readable: true,
          writable: true,
          exportable: true,
          validations:
           [ { inclusion:
                { in:
                   [ 'Archive',
                     'Cable/MSO',
                     'Cinema operator',
                     'Commercial broadcaster',
                     'Distributor',
                     'Film studio',
                     'Home Entertainment',
                     '(Independent) production',
                     'Intermediary',
                     'Mobile operator',
                     'Non profit organization',
                     'OEM',
                     'Other',
                     'Other media company',
                     'Pay-TV',
                     'Public service broadcaster',
                     'Telco/ISP',
                     'Theatrical distributor',
                     'Web site/IPTV' ],
                  allow_blank: true } } ],
          type: 'string' },
       responsibility:
        { readable: true,
          writable: true,
          exportable: true,
          validations:
           [ { inclusion:
                { in:
                   [ 'Acquisitions',
                     'Advertising',
                     'Marketing',
                     'Operations',
                     'Programming',
                     'Publicity',
                     'Research',
                     'Other' ],
                  allow_blank: true } } ],
          type: 'string' },
       interests:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'array' },
       company_profile:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'array' },
       source_updated_at:
        { readable: true, writable: true, exportable: true, type: 'date' },
       skip_marketing_emails:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'boolean' },
       territory_rep:
        { readable: true,
          writable: true,
          exportable: true,
          type: 'string' },
       geo_scopes:
        { type: 'https://um.api.mediastore.dev/v20140601/context/geo_scope',
          collection: true,
          readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { maximum: 24 } } ] },
       groups:
        { type: 'https://um.api.mediastore.dev/v20140601/context/group',
          collection: true,
          readable: true,
          writable: false,
          exportable: false },
       organization:
        { type:
           'https://um.api.mediastore.dev/v20140601/context/organization',
          collection: false,
          readable: true,
          writable: true,
          exportable: true,
          required: true },
       responsible_user:
        { type: 'https://um.api.mediastore.dev/v20140601/context/user',
          collection: false,
          readable: true,
          writable: true,
          exportable: true },
       role:
        { type: 'https://um.api.mediastore.dev/v20140601/context/role',
          collection: false,
          readable: true,
          writable: true,
          exportable: true },
       password:
        { type:
           'https://um.api.mediastore.dev/v20140601/context/user/password',
          collection: false,
          readable: true,
          writable: false,
          exportable: false },
       phones:
        { type:
           'https://um.api.mediastore.dev/v20140601/context/user/phone',
          collection: true,
          readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { maximum: 5 } } ] },
       im_contacts:
        { type:
           'https://um.api.mediastore.dev/v20140601/context/user/im_contact',
          collection: true,
          readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { maximum: 5 } } ] },
       social_media_profiles:
        { type:
           'https://um.api.mediastore.dev/v20140601/context/user/social_media_profile',
          collection: true,
          readable: true,
          writable: true,
          exportable: true,
          validations: [ { length: { maximum: 5 } } ] },
       address:
        { type:
           'https://um.api.mediastore.dev/v20140601/context/user/address',
          collection: false,
          readable: true,
          writable: true,
          exportable: true },
       country:
        { type: 'https://um.api.mediastore.dev/v20140601/context/geography',
          collection: false,
          readable: true,
          writable: false,
          exportable: false },
       division:
        { type: 'https://um.api.mediastore.dev/v20140601/context/division',
          collection: false,
          readable: true,
          writable: true,
          exportable: false },
       preview_image:
        { type:
           'https://am.api.mediastore.dev/v20140601/context/preview_image',
          collection: false,
          readable: true,
          writable: true,
          exportable: false } },
    constants:
     { access_levels: [ 'company', 'viewable' ],
       titles: [ 'PhD', 'Prof' ],
       genders: [ 'Male', 'Female' ],
       status:
        [ 'inactive',
          'pending',
          'rejected',
          'invited',
          'active',
          'blocked',
          'deleted' ],
       customer_segments:
        [ 'Archive',
          'Cable/MSO',
          'Cinema operator',
          'Commercial broadcaster',
          'Distributor',
          'Film studio',
          'Home Entertainment',
          '(Independent) production',
          'Intermediary',
          'Mobile operator',
          'Non profit organization',
          'OEM',
          'Other',
          'Other media company',
          'Pay-TV',
          'Public service broadcaster',
          'Telco/ISP',
          'Theatrical distributor',
          'Web site/IPTV' ],
       responsibilities:
        [ 'Acquisitions',
          'Advertising',
          'Marketing',
          'Operations',
          'Programming',
          'Publicity',
          'Research',
          'Other' ] },
    member_actions:
     { get:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template: 'https://um.api.mediastore.dev/v20140601/user/{user_id}',
          mappings: [ { variable: 'user_id', source: 'id', required: true } ] },
       update:
        { method: 'PATCH',
          expects: 'https://um.api.mediastore.dev/v20140601/context/user',
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template: 'https://um.api.mediastore.dev/v20140601/user/{user_id}',
          mappings: [ { variable: 'user_id', source: 'id', required: true } ] },
       invite:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template:
           'https://um.api.mediastore.dev/v20140601/user/{user_id}/invite',
          mappings: [ { variable: 'user_id', source: 'id' } ] },
       approve:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template:
           'https://um.api.mediastore.dev/v20140601/user/{user_id}/approve',
          mappings: [ { variable: 'user_id', source: 'id' } ] },
       block:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template:
           'https://um.api.mediastore.dev/v20140601/user/{user_id}/block',
          mappings: [ { variable: 'user_id', source: 'id' } ] },
       unblock:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template:
           'https://um.api.mediastore.dev/v20140601/user/{user_id}/unblock',
          mappings: [ { variable: 'user_id', source: 'id' } ] },
       reject:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template:
           'https://um.api.mediastore.dev/v20140601/user/{user_id}/reject',
          mappings: [ { variable: 'user_id', source: 'id' } ] },
       delete:
        { method: 'DELETE',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template: 'https://um.api.mediastore.dev/v20140601/user/{user_id}',
          mappings: [ { variable: 'user_id', source: 'id', required: true } ] },
       restore:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template:
           'https://um.api.mediastore.dev/v20140601/user/{user_id}/restore',
          mappings: [ { variable: 'user_id', source: 'id' } ] },
       add_geo_scopes:
        { method: 'POST',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_id}/geo_scopes/{geo_scope_ids}/add',
          mappings:
           [ { variable: 'user_id', source: 'id', required: true },
             { variable: 'geo_scope_ids', required: true } ] },
       remove_geo_scopes:
        { method: 'DELETE',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_id}/geo_scopes/{geo_scope_ids}/remove',
          mappings:
           [ { variable: 'user_id', source: 'id', required: true },
             { variable: 'geo_scope_ids', required: true } ] },
       update_geo_scopes:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_id}/geo_scopes/{geo_scope_ids}',
          mappings:
           [ { variable: 'user_id', source: 'id', required: true },
             { variable: 'geo_scope_ids', required: true } ] } },
    collection_actions:
     { query:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users{?ids,q,qfields,per,page,sort,order,include_deleted}',
          mappings:
           [ { variable: 'ids', source: 'id' },
             { variable: 'q' },
             { variable: 'qfields', required: false },
             { variable: 'page' },
             { variable: 'per' },
             { variable: 'sort' },
             { variable: 'order' },
             { variable: 'include_deleted' } ] },
       search:
        { method: 'POST',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/search{?ids,q,qfields,per,page,sort,order,include_deleted}',
          mappings:
           [ { variable: 'ids', source: 'id' },
             { variable: 'q' },
             { variable: 'qfields', required: false },
             { variable: 'page' },
             { variable: 'per' },
             { variable: 'sort' },
             { variable: 'order' },
             { variable: 'include_deleted' } ] },
       create:
        { method: 'POST',
          expects: 'https://um.api.mediastore.dev/v20140601/context/user',
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response: 'https://um.api.mediastore.dev/v20140601/context/user',
          template: 'https://um.api.mediastore.dev/v20140601/users',
          mappings: [] },
       get:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template: 'https://um.api.mediastore.dev/v20140601/users/{user_ids}',
          mappings: [ { variable: 'user_ids', source: 'id', required: true } ] },
       update:
        { method: 'PATCH',
          expects: 'https://um.api.mediastore.dev/v20140601/context/user',
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template: 'https://um.api.mediastore.dev/v20140601/users/{user_ids}',
          mappings: [ { variable: 'user_ids', source: 'id', required: true } ] },
       invite:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/invite',
          mappings: [ { variable: 'user_ids', source: 'id' } ] },
       approve:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/approve',
          mappings: [ { variable: 'user_ids', source: 'id' } ] },
       review:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/review',
          mappings: [ { variable: 'user_ids', source: 'id' } ] },
       block:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/block',
          mappings: [ { variable: 'user_ids', source: 'id' } ] },
       unblock:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/unblock',
          mappings: [ { variable: 'user_ids', source: 'id' } ] },
       reject:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/reject',
          mappings: [ { variable: 'user_ids', source: 'id' } ] },
       delete:
        { method: 'DELETE',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template: 'https://um.api.mediastore.dev/v20140601/users/{user_ids}',
          mappings: [ { variable: 'user_ids', source: 'id', required: true } ] },
       restore:
        { method: 'PUT',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/restore',
          mappings: [ { variable: 'user_ids', source: 'id' } ] },
       query_groups:
        { method: 'GET',
          expects: null,
          resource: 'https://um.api.mediastore.dev/v20140601/context/user',
          response:
           'https://um.api.mediastore.dev/v20140601/context/collection',
          template:
           'https://um.api.mediastore.dev/v20140601/users/{user_ids}/groups{?ids,q,qfields,page,per,sort,order}',
          mappings:
           [ { variable: 'user_ids', source: 'id', required: true },
             { variable: 'ids' },
             { variable: 'q' },
             { variable: 'qfields', required: false },
             { variable: 'page' },
             { variable: 'per' },
             { variable: 'sort' },
             { variable: 'order' } ] } } } }
