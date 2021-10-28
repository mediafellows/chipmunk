import UriTemplate from 'uri-templates'
import {first, includes, some, find, compact, attempt, values, merge, pick, assign as write, reduce, map, get, flatten, each, isEmpty, isArray} from 'lodash'

import {IConfig} from './config'
import getSpec, {IAction, ISpec, isJsonLDSpec} from './spec'
import action, {IResult} from './action'

interface IRefs extends Array<{ [s: string]: any }> {
  isHabtm: boolean
}

export const extractReferences = (objects, name):IRefs => {
  const result = flatten(compact(map(objects, (o) => get(o, `@associations.${name}`) || get(o, `$associations.${name}`)))) as IRefs
  result.isHabtm = some(objects, (object) => isArray(get(object, `@associations.${name}`) || get(object, `$associations.${name}`)))

  return result
}

export const extractProps = (spec: ISpec, references) => {
  const collectionQuery = spec.action('query')
  const collectionGet = spec.action('query')

  let memberGet
  if (isJsonLDSpec(spec)) {
    memberGet = spec.member_actions['get']
  }

  const result = {}

  each(compact([memberGet, collectionGet, collectionQuery]), (action) => {
    const template = UriTemplate(action.template)

    try {
      each(references, (reference) => {
        const values = template.fromUri(reference)

        each(action.mappings, (mapping) => {
          const value = values[mapping.variable]
          if (!value) return
          if (!result[mapping.source]) result[mapping.source] = []
          if (includes(result[mapping.source], value)) return

          result[mapping.source].push(value)
        })
      })
    }
    catch {}
  })

  return result
}

const buildParams = (spec: ISpec, props) => {
  const collectionGet = spec.action('get')

  const result = {}

  each(collectionGet.mappings || [], (mapping) => {
    if (props[mapping.source]) result[mapping.variable] = props[mapping.source]
  })

  return result
}

export const fetch = async (objects: any[], name: string, config: IConfig):Promise<IResult> => {
  // since it might be possible the association we're looking for is only available for a subset of our objects
  // we first need to find the spec that contains a definition for the desired association..
  const specs = await Promise.all(map(objects, (obj) => getSpec(obj['@context'] || obj['$schema'], config)))
  const objectSpec = find(specs, (spec) => spec.associations[name]) as ISpec

  if (!objectSpec) {
    throw new Error(`could not find the requested association '${name}'`)
  }

  const associationProperty = objectSpec.associations[name]
  const ref = associationProperty.type || associationProperty['$ref'] || associationProperty['$jsonld_context']
  const associationSpec = await getSpec(ref, config)

  const references = extractReferences(objects, name)
  const extractedProps = extractProps(associationSpec, references)
  const params = buildParams(associationSpec, extractedProps)

  const many = associationProperty.collection || associationProperty.type === 'array'
  const actionName = many && !references.isHabtm ? 'query' : 'get'
  return action(ref, actionName, { params }, config)
}

export const assign = (targets: any[], objects: any[], name: string, config: IConfig):void => {
  const objectsById = reduce(objects, (acc, object) => write(acc, { [object['@id']]: object }), {})
  const targetsById = reduce(targets, (acc, target) => write(acc, { [target['@id']]: target }), {})

  /*
   * if our target association references match any of the objects by @id, simply assign them
   * this satisfies 'belongs_to', 'has_one' & 'HABTM' associations
   */
  each(targets, (target) => {
    const ref = get(target, `@associations[${name}]`) || get(target, `$associations[${name}]`)

    if (isArray(ref)) {
      const matches = pick(objectsById, ref)
      if (!isEmpty(matches)) Object.defineProperty(target, name, { value: values(matches) })
    }
    else {
      const match = objectsById[ref]
      if (!isEmpty(match)) Object.defineProperty(target, name, { value: match })
    }
  })

  /*
   * if any of our object association references point to one of our targets, assign them
   * this satifies 'has many' associations
  */
  each(objects, (object) => {
    const refs = get(object, '@associations') || get(object, '$associations') || []
    each(refs, (ref) => {
      const target = targetsById[ref]
      if (!isEmpty(target)) {
        const value = target[name];
        if (value && !isArray(value)) return // already has a value which is not an array, abort.

        if (value) target[name].push(object)
        else Object.defineProperty(target, name, { value: [object] })
      }
    })
  })

  // set to null for all targets we didn't find association data for..
  each(targets, (target) => {
    const value = target[name];
    if (!value) Object.defineProperty(target, name, { value: null })
  })
}
