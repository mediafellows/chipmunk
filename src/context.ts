import {get, first, reduce, includes, merge, cloneDeep} from 'lodash'
import {IConfig} from './config'
import {request, run} from './request'
import {set as cacheSet, get as cacheGet} from './cache'
import {pending} from './watcher'

const uriCheck = /https?:\/\//i

export interface IProperty {
  type: string
  readable: boolean
  writable: boolean
  exportable: boolean
  required?: boolean
  validations?: any[]
  collection?: boolean
}

export interface IAction {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  collection: boolean
  template: string
  mappings: { [s:string]: string }[]
  expects?: string
  resource?: string
  response?: string
}

export interface IContext {
  properties: { [s:string]: IProperty }
  associations: { [s:string]: IProperty }
  constants: { [s:string]: string[] }
  member_actions: IAction[]
  collection_actions: IAction[]
  action: (name: string) => IAction
}

export default async (urlOrAppModel: string, config: IConfig):Promise<IContext> => {
  let url

  if (uriCheck.test(urlOrAppModel)) {
    url = first(urlOrAppModel.split('?'))
  }
  else {
    const [app, model] = urlOrAppModel.split('.')
    url = `${config.endpoints[app]}/context/${model}`
  }

  let context

  if (config.cache.enabled && config.cache.default) {
    const cached = cacheGet(url, { engine: config.cache.default }, config)
    if (cached) context = cloneDeep(cached) as IContext
  }

  if (!context) {
    let res

    if (pending(url, config)) {
      res = await pending(url, config)
    }
    else {
      const req = request(config)
        .get(url)

      if (config.timestamp) req.query({ t: config.timestamp })

      res = await run(req, config)
    }

    context = get(res, `body['@context']`) as IContext
  }

  if (!context) throw new Error(`Failed to fetch context ${urlOrAppModel}`)

  if (config.cache.enabled && config.cache.default) {
    cacheSet(url, cloneDeep(context), { engine: config.cache.default }, config)
  }

  context.action = (actionName: string):IAction => {
    let action, type, name

    name = actionName
    if (includes(actionName, '.')) [type, name] = actionName.split('.')

    if (type !== 'member' && context.collection_actions[name]) {
      action = context.collection_actions[name]
      action.collection = true
    }
    else if (context.member_actions[name]) {
      action = context.member_actions[name]
      action.collection = false
    }

    return action
  }

  context.associations = reduce(context.properties, (assocs, prop, name) => {
    return uriCheck.test(prop.type) ? merge(assocs, { [name]: prop }) : assocs
  }, {})

  return context
}
