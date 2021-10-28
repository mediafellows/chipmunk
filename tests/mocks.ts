import nock from 'nock'

import {IConfig} from '../src/config'
import {matches} from './setup'

import userContext from './fixtures/user.context'
import userManagerContext from './fixtures/user_manager.context'
import phoneContext from './fixtures/phone.context'
import organizationContext from './fixtures/organization.context'
import sessionContext from './fixtures/session.context'
import geoScopeContext from './fixtures/geo_scope.context'
import tucoContext from './fixtures/tuco.context'
import bicycleSchema from './fixtures/bicycle.schema'
import manufacturerSchema from './fixtures/manufacturer.schema'
import wheelSchema from './fixtures/wheel.schema'

export const mockContexts = (config: IConfig) => {
  nock(config.endpoints.um)
    .persist()

    .get(matches('context/session'))
    .optionally()
    .reply(200, sessionContext)

    .get(matches('context/user/phone'))
    .optionally()
    .reply(200, phoneContext)

    .get(matches('context/user/manager'))
    .optionally()
    .reply(200, userManagerContext)

    .get(matches('context/user'))
    .optionally()
    .reply(200, userContext)

    .get(matches('context/organization'))
    .optionally()
    .reply(200, organizationContext)

    .get(matches('context/geo_scope'))
    .optionally()
    .reply(200, geoScopeContext)

    .get(matches('context/foo'))
    .optionally()
    .reply(404)

  nock(config.endpoints.tuco)
    .persist()

    .get(matches('context/request'))
    .optionally()
    .reply(200, tucoContext)

  nock(config.endpoints.my)
    .persist()

    .get(matches('schemas/my.bicycle'))
    .optionally()
    .reply(200, bicycleSchema)

    .get(matches('schemas/my.manufacturer'))
    .optionally()
    .reply(200, manufacturerSchema)

    .get(matches('schemas/my.wheel'))
    .optionally()
    .reply(200, wheelSchema)
}
