import 'mocha'
import {expect} from 'chai'
import {get, merge} from 'lodash'
import createConfig from '../src/config'

import {setup} from './setup'
import createChipmunk from '../src'

const config = setup()
let chipmunk

describe('config', () => {
  beforeEach(() => {
    chipmunk = createChipmunk(config)
  })

  it('returns an object', () => {
    expect(createConfig()).to.be.a('Object')
  })

  it('updates the settings', () => {
    const conf = createConfig({ endpoints: { um: 'http://um.app' } })

    let value = get(conf, 'endpoints.um')
    expect(value).to.equal('http://um.app')
  })

  it('merges multiple configs', () => {
    const conf = createConfig(
      { endpoints: { um: 'http://um.app' } },
      { verbose: true }
    )

    expect(conf.endpoints.um).to.equal('http://um.app')
    expect(conf.verbose).to.be.true
  })

  describe('#cachePrefix', () => {
    it('uses affiliation and role as prefix', () => {
      const conf = createConfig({ cache: { enabled: true }, headers: { 'Affiliation-Id': 'mpx', 'Role-Id': 5, 'Session-Id': '24FA' } })
      expect(conf.cache.prefix).to.equal('mpx-5')
    })

    it('uses the session id as prefix', () => {
      const conf = createConfig({ cache: { enabled: true }, headers: { 'Session-Id': '24FA' } })
      expect(conf.cache.prefix).to.equal('24FA')
    })

    it('uses _anonymous_ as prefix', () => {
      const conf = createConfig()
      expect(conf.cache.prefix).to.equal('anonymous')
    })
  })
})
