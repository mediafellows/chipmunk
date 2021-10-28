import 'mocha'
import {expect} from 'chai'
import {get} from 'lodash'
import nock from 'nock'

import createChipmunk from '../src'
import {extractProps} from '../src/association'
import {setup, matches} from './setup'

const config = setup()
let chipmunk

describe('association', () => {
  beforeEach(() => {
    chipmunk = createChipmunk(config)
  })

  describe('extractProps', () => {
    it('extracts from belongs to references', async () => {
      const context = await chipmunk.context('um.organization')
      const references = [
        'https://um.api.mediapeers.mobi/v20140601/organization/104',
        'https://um.api.mediapeers.mobi/v20140601/organization/105',
      ]

      const expected = {
        id: ['104', '105']
      }

      expect(extractProps(context, references)).to.eql(expected)
    })

    it('extracts from has many references', async () => {
      const context = await chipmunk.context('um.user/phone')
      const references = [
        'https://um.api.mediapeers.mobi/v20140601/users/1659/phones',
        'https://um.api.mediapeers.mobi/v20140601/users/1660/phones',
      ]

      const expected = {
        user_id: ['1659', '1660']
      }

      expect(extractProps(context, references)).to.eql(expected)
    })
  })

  describe('fetch', () => {
    describe('belongs to', () => {
      it('fetches the organizations for a set of users', async () => {
        nock(config.endpoints.um)
          .get(matches('/organizations/104,105'))
          .reply(200, { members: [
            { '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user', id: 'first' },
            { '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user', id: 'second' },
          ]})

        const users = [
          {
            '@id': 'https://um.api.mediapeers.mobi/v20140601/user/1659',
            '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user',
            '@type': 'user',
            '@associations': {
              organization: 'https://um.api.mediapeers.mobi/v20140601/organization/104',
            },
            id: 1659,
            organization_id: 104,
          },
          {
            '@id': 'https://um.api.mediapeers.mobi/v20140601/user/1660',
            '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user',
            '@type': 'user',
            '@associations': {
              organization: 'https://um.api.mediapeers.mobi/v20140601/organization/105',
            },
            id: 1659,
            organization_id: 105,
          }
        ]

        const result = await chipmunk.fetch(users, 'organization')
        expect(result.objects.length).to.be.gt(1)
      })

      it('fetches the owners of bicycles (mm3)', async () => {
        nock(config.endpoints.um)
          .get(matches('/users/104,105'))
          .reply(200, { members: [
            { '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user', id: 'first' },
            { '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user', id: 'second' },
          ]})

        const bicycles = [
          {
            '$id': 'https://my.api.mediapeers.mobi/v2021/bicycles/1659',
            '$schema': 'https://my.api.mediapeers.mobi/v2021/schemas/my.bicycle.json',
            '$associations': {
              // mind this has to point to member get actions for JSON LD objects
              // since this is what the v2014 api most widely supports
              owner: 'https://um.api.mediapeers.mobi/v20140601/user/104',
            },
            id: 1659,
            owner_id: 104,
          },
          {
            '$id': 'https://my.api.mediapeers.mobi/v2021/bicycles/1660',
            '$schema': 'https://my.api.mediapeers.mobi/v2021/schemas/my.bicycle.json',
            '$associations': {
              owner: 'https://um.api.mediapeers.mobi/v20140601/user/105',
            },
            id: 1660,
            owner_id: 105,
          },
        ]

        const result = await chipmunk.fetch(bicycles, 'owner')
        expect(result.objects.length).to.be.gt(1)
      })
    })

    describe('has many', () => {
      it('fetches the phones for a set of users', async () => {
        nock(config.endpoints.um)
          .get(matches('/users/1659,1660/phones'))
          .reply(200, { members: [
            { '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user', id: 'first' },
            { '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user', id: 'second' },
          ]})

        const users = [
          {
            '@id': 'https://um.api.mediapeers.mobi/v20140601/user/1659',
            '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user',
            '@type': 'user',
            '@associations': {
              phones: 'https://um.api.mediapeers.mobi/v20140601/users/1659/phones',
            },
            id: 1659,
          },
          {
            '@id': 'https://um.api.mediapeers.mobi/v20140601/user/1660',
            '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user',
            '@type': 'user',
            '@associations': {
              phones: 'https://um.api.mediapeers.mobi/v20140601/users/1660/phones',
            },
            id: 1660,
          }
        ]

        const result = await chipmunk.fetch(users, 'phones')
        expect(result.objects.length).to.be.gt(1)
      })
    })

    describe('has and belongs to many', () => {
      it('fetches the geo scopes for a set of users', async () => {
        nock(config.endpoints.um)
          .get(matches('/geo_scopes/UGA,SWZ,UZB,XEU'))
          .reply(200, { members: [
            { '@context': 'https://um.api.mediapeers.mobi/v20140601/context/geo_scope', id: 'UGA' },
            { '@context': 'https://um.api.mediapeers.mobi/v20140601/context/geo_scope', id: 'SWZ' },
            { '@context': 'https://um.api.mediapeers.mobi/v20140601/context/geo_scope', id: 'UZB' },
            { '@context': 'https://um.api.mediapeers.mobi/v20140601/context/geo_scope', id: 'XEU' },
          ]})

        const users = [
          {
            '@id': 'https://um.api.mediapeers.mobi/v20140601/user/1',
            '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user',
            '@type': 'user',
            '@associations': {},
            id: 1,
          },
          {
            '@id': 'https://um.api.mediapeers.mobi/v20140601/user/1659',
            '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user/manager',
            '@type': 'user',
            '@associations': {
              geo_scopes: [
                'https://um.api.mediapeers.mobi/v20140601/geo_scope/UGA',
                'https://um.api.mediapeers.mobi/v20140601/geo_scope/SWZ',
              ],
            },
            id: 1659,
          },
          {
            '@id': 'https://um.api.mediapeers.mobi/v20140601/user/1660',
            '@context': 'https://um.api.mediapeers.mobi/v20140601/context/user/manager',
            '@type': 'user',
            '@associations': {
              geo_scopes: [
                'https://um.api.mediapeers.mobi/v20140601/geo_scope/UZB',
                'https://um.api.mediapeers.mobi/v20140601/geo_scope/XEU',
              ],
            },
            id: 1660,
          }
        ]

        const result = await chipmunk.fetch(users, 'geo_scopes')
        expect(result.objects.length).to.be.gt(1)
      })
    })
  })

  describe('assign', () => {
    it('assigns belongs to associations', () => {
      const targets = [
        {
          '@type': 'user',
          '@associations': { },
          organization: null,
        },
        {
          '@type': 'user',
          '@associations': {
            organization: 'https://um.api.mediapeers.mobi/v20140601/organization/105',
          },
          organization: null,
        },
      ]

      const objects = [
        {
          '@type': 'organization',
          '@id': 'https://um.api.mediapeers.mobi/v20140601/organization/105',
        },
        {
          '@type': 'organization',
          '@id': 'https://um.api.mediapeers.mobi/v20140601/organization/106',
        },
      ]

      chipmunk.assign(targets, objects, 'organization')
      expect(targets[0]['organization']).to.be.null // could not be found
      expect(targets[1]['organization']).to.exist
    })

    it('assigns HABTM associations', () => {
      const targets = [
        {
          '@type': 'user',
          '@associations': {
            geo_scopes: [
              'https://um.api.mediapeers.mobi/v20140601/geo_scope/UGA',
              'https://um.api.mediapeers.mobi/v20140601/geo_scope/SWZ',
            ],
          },
          geo_scopes: null,
        },
        {
          '@type': 'user',
          '@associations': {
            organization: 'https://um.api.mediapeers.mobi/v20140601/organization/105',
            geo_scopes: [
              'https://um.api.mediapeers.mobi/v20140601/geo_scope/XEU',
              'https://um.api.mediapeers.mobi/v20140601/geo_scope/UGA',
            ],
          },
          geo_scopes: null,
        },
      ]

      const objects = [
        {
          '@type': 'geo_scope',
          '@id': 'https://um.api.mediapeers.mobi/v20140601/geo_scope/SWZ',
        },
        {
          '@type': 'geo_scope',
          '@id': 'https://um.api.mediapeers.mobi/v20140601/geo_scope/UGA',
        },
        {
          '@type': 'geo_scope',
          '@id': 'https://um.api.mediapeers.mobi/v20140601/geo_scope/XEU',
        },
      ]

      chipmunk.assign(targets, objects, 'geo_scopes')
      expect(get(targets, `[0].geo_scopes[0]['@id']`)).to.equal('https://um.api.mediapeers.mobi/v20140601/geo_scope/UGA')
      expect(get(targets, `[1].geo_scopes[0]['@id']`)).to.equal('https://um.api.mediapeers.mobi/v20140601/geo_scope/XEU')
      expect(get(targets, `[1].geo_scopes[1]['@id']`)).to.equal('https://um.api.mediapeers.mobi/v20140601/geo_scope/UGA')
    })

    it('assigns has many associations', () => {
      const targets = [
        {
          '@type': 'user',
          '@id': 'https://um.api.mediapeers.mobi/v20140601/user/1660',
          '@associations': {
            phones: 'https://um.api.mediapeers.mobi/v20140601/users/1660/phones',
          },
          phones: null,
        },
        {
          '@type': 'user',
          '@id': 'https://um.api.mediapeers.mobi/v20140601/user/1661',
          '@associations': {
            phones: 'https://um.api.mediapeers.mobi/v20140601/users/1661/phones',
          },
          phones: null,
        },
      ]

      const objects = [
        {
          '@type': 'phone',
          '@id': 'https://um.api.mediapeers.mobi/v20140601/user/phone/4',
          '@associations': {
            user: 'https://um.api.mediapeers.mobi/v20140601/user/1660',
          },
        },
        {
          '@type': 'phone',
          '@id': 'https://um.api.mediapeers.mobi/v20140601/user/phone/5',
          '@associations': {
            user: 'https://um.api.mediapeers.mobi/v20140601/user/1660',
          },
        },
      ]

      chipmunk.assign(targets, objects, 'phones')
      expect(get(targets, '[0].phones.length')).to.equal(2)
      expect(get(targets, '[1].phones')).to.be.null
    })
  })
})
