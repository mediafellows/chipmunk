import {get, first, reduce, includes, merge, cloneDeep, startsWith} from 'lodash'
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

export interface ISpec {
  url: string
  properties: { [s:string]: IProperty }
  associations: { [s:string]: IProperty }
  constants: { [s:string]: string[] | string | number | boolean }
  actions: IAction[]
  action: (name: string) => IAction
}

export interface IJsonSchemaSpec extends ISpec { }

export interface IJsonLDSpec extends ISpec {
  member_actions: IAction[]
  collection_actions: IAction[]
}

export const isJsonSchemaSpec = (spec: any): spec is IJsonSchemaSpec => {
  return get(spec, 'url', '').includes('/schemas')
}

export const isJsonLDSpec = (spec: any): spec is IJsonLDSpec => {
  return get(spec, 'url', '').includes('/context')
}

export const getSpec = async (urlOrAppModel, config: IConfig): Promise<ISpec> => {
  let url

  if (uriCheck.test(urlOrAppModel)) {
    url = first(urlOrAppModel.split('?'))
  }
  else {
    if (startsWith(urlOrAppModel, 'mm3:')) {
      const [_mm3, appModel] = urlOrAppModel.split(':')
      const [app, model] = appModel.split('.')
      url = `${config.endpoints[app]}/v2021/schemas/${model}`
    }
    else {
      const [app, model] = urlOrAppModel.split('.')
      url = `${config.endpoints[app]}/v20140601/context/${model}`
    }
  }

  let spec

  if (config.cache.enabled && config.cache.default) {
    const cached = cacheGet(url, { engine: config.cache.default }, config)
    if (cached) spec = cloneDeep(cached) as ISpec
  }

  if (!spec) {
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

    spec = get(res, `body['@context']`) || get(res, 'body')
    spec.url = url

    if (config.cache.enabled && config.cache.default) {
      cacheSet(url, cloneDeep(spec), { engine: config.cache.default }, config)
    }

    if (!spec) throw new Error(`Failed to fetch spec ${url}`)

    if (isJsonLDSpec(spec)) {
      spec.action = (actionName: string):IAction => {
        let action, type, name

        name = actionName
        if (includes(actionName, '.')) [type, name] = actionName.split('.')

        if (type !== 'member' && spec.collection_actions[name]) {
          action = spec.collection_actions[name]
          action.collection = true
        }
        else if (spec.member_actions[name]) {
          action = spec.member_actions[name]
          action.collection = false
        }

        return action
      }

      spec.associations = reduce(spec.properties, (assocs, prop, name) => {
        return uriCheck.test(prop.type) ? merge(assocs, { [name]: prop }) : assocs
      }, {})
    }
    else if (isJsonSchemaSpec(spec)) {
      spec.action = (actionName: string): IAction => {
        return spec.actions[actionName]
      }

      spec.associations = reduce(spec.properties, (assocs, prop, name) => {
        return prop['$jsonld_context'] || prop['$ref'] ? merge(assocs, { [name]: prop }) : assocs
      }, {})
    }

    return spec
  }
}

export default getSpec
