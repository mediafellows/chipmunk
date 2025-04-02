import UriTemplate from "uri-templates";

import first from "lodash/first";
import every from "lodash/every";
import keys from "lodash/keys";
import includes from "lodash/includes";
import filter from "lodash/filter";
import find from "lodash/find";
import compact from "lodash/compact";
import values from "lodash/values";
import pick from "lodash/pick";
import write from "lodash/assign";
import reduce from "lodash/reduce";
import uniq from "lodash/uniq";
import concat from "lodash/concat";
import toString from "lodash/toString";
import map from "lodash/map";
import get from "lodash/get";
import flatten from "lodash/flatten";
import each from "lodash/each";
import isEmpty from "lodash/isEmpty";
import isArray from "lodash/isArray";
import isEqual from "lodash/isEqual";
import mergeWith from 'lodash/mergeWith';

import { IConfig } from "./config";
import getSpec, {
  IAction,
  ISpec,
  isJsonLDSpec,
  IProperty,
  isJsonSchemaSpec,
} from "./spec";
import { IObject } from "./action";
import unfurl from "./unfurl";

export interface IExtractedProps {
  isHABTM: boolean;
  propsByObject: { [s: string]: any[] };
  allProps: { [s: string]: any[] };
}

export interface IFetchedResults {
  assocName: string;
  many: boolean;
  extractedProps: IExtractedProps;
  objects: IObject[];
}

export const getProps = (spec: ISpec, references) => {
  const collectionQuery = spec.action("query");
  const collectionGet = spec.action("get");

  let memberGet;
  if (isJsonLDSpec(spec)) {
    memberGet = spec.member_actions["get"];
  }

  const result = {};

  each(compact([memberGet, collectionGet, collectionQuery]), (action) => {
    const template = UriTemplate(action.template);

    try {
      each(references, (reference) => {
        const values = template.fromUri(reference);

        each(action.mappings, (mapping) => {
          const value = values[mapping.variable];
          if (!value) return;
          if (!result[mapping.source]) result[mapping.source] = [];

          result[mapping.source] = uniq(concat(result[mapping.source], value));
        });
      });
    } catch {}
  });

  return result;
};

export const getSpecUrl = (prop: IProperty): string | null => {
  const path = find(
    ["$jsonld_context", "$ref", "items.$jsonld_context", "items.$ref"],
    (x) => !!get(prop, x)
  );
  return (path && (get(prop, path) as string));
};

export const getSpecIdentifier = (prop: IProperty): string | null => {
  return getSpecUrl(prop) || prop.type;
};

export const getId = (object) => {
  return object["@id"] || object["$id"];
};

export const extractProps = (
  assocName,
  associationSpec,
  objects
): IExtractedProps => {
  let isHABTM = false;
  const refsByObject = reduce(
    objects,
    (acc, object) => {
      const id = getId(object);
      const ref =
        get(object, `@associations.${assocName}`) ||
        get(object, `$links.${assocName}`);
      if (!isHABTM && isArray(ref)) isHABTM = true; // JSON LD case only
      return ref ? write(acc, { [id]: ref }) : acc;
    },
    {}
  );

  const propsByObject = reduce(
    refsByObject,
    (acc, ref, id) => {
      const props = getProps(associationSpec, flatten([ref]));
      return write(acc, { [id]: props });
    },
    {}
  );

  const allRefs = values(refsByObject);
  const allProps = getProps(associationSpec, flatten(allRefs));

  return {
    isHABTM,
    propsByObject,
    allProps,
  };
};

const buildParams = (action: IAction, props) => {
  const result = {};

  each(action.mappings || [], (mapping) => {
    if (props[mapping.source]) result[mapping.variable] = props[mapping.source];
  });

  return result;
};

export const fetch = async (
  objects: any[],
  assocName: string,
  { defaultAssociationsSearch , ...config }: IConfig = {}
): Promise<IFetchedResults> => {
  // since it might be possible the association we're looking for is only available for a subset of our objects
  // we first need to find the spec that contains a definition for the desired association..
  const specs = await Promise.all(
    map(objects, (obj) => getSpec(obj["@context"] || obj["$schema"], config))
  );
  const objectSpec = find(
    specs,
    (spec) => spec.associations[assocName]
  ) as ISpec;

  if (!objectSpec) {
    throw new Error(`could not find the requested association '${assocName}'`);
  }

  const associationProperty = objectSpec.associations[assocName];
  const specUrl = getSpecIdentifier(associationProperty);
  const associationSpec = await getSpec(specUrl, config);

  const extractedProps = extractProps(assocName, associationSpec, objects);
  const referencedById = isEqual(keys(extractedProps.allProps), ['id']); // only extracted prop is 'id'

  const many =
    associationProperty["collection"] || associationProperty.type === "array";

  let performSearch = false;
  let searchAction;
  let actionName;
  let params;

  // favour search action if available,
  if (referencedById && (searchAction = associationSpec.action('search'))) {
    performSearch = true;
    actionName = 'search';
    params = buildParams(searchAction, extractedProps.allProps);
  } else if (isJsonLDSpec(objectSpec)) {
    // for JSON LD objects -> stick to the original implementation
    actionName = many && !extractedProps.isHABTM ? "query" : "get";
    params = buildParams(
      associationSpec.action(actionName),
      extractedProps.allProps
    );
  } else if (isJsonSchemaSpec(objectSpec)) {
    // for JSON Schema objects -> try to find template that matches best
    // TODO: consider to use this for JSON LD + JSON Schema
    actionName = find(["search", "get", "query"], (name) => {
      const associationAction = associationSpec.action(name);
      if (!associationAction) return;

      // find action where all vars can be replaced using our 'extractedProps'
      params = buildParams(associationAction, extractedProps.allProps);
      const paramNames = map(keys(params), (x) => `{${x}}`);
      const varNames = associationAction.template.match(/{\w+}/gi);

      return every(varNames, (x) => includes(paramNames, x));
    });
  }

  if (!actionName) {
    throw new Error(
      `could not find the association action to resolve data for '${assocName}'`
    );
  }

  let result;
  if (performSearch) {
    const ids = [...extractedProps.allProps['id']];
    let associationSearch = {};
    if (assocName && defaultAssociationsSearch?.[assocName]) {
      associationSearch = defaultAssociationsSearch[assocName];
    }

    // covers filters array
    const customizer = (objValue, srcValue) => {
      if (isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    }

    result = await unfurl(specUrl, actionName, { params, body: mergeWith({ search: { filters: [['id', 'in', ids]] } }, associationSearch, customizer) }, config)
  }
  else {
    result = await unfurl(specUrl, actionName, { params }, config);
  }

  return {
    assocName,
    many,
    extractedProps,
    objects: result.objects,
  };
};

export const assignEmpty = (targets: IObject[], assocName: string): void => {
  // set to null for all targets we didn't find association data for..
  each(targets, (target) => {
    const value = target[assocName];
    if (!value) Object.defineProperty(target, assocName, { value: null });
  });
};

export const assignToJsonLd = (
  targets: IObject[],
  objects: IObject[],
  assocName: string
): void => {
  const objectsById = reduce(
    objects,
    (acc, object) => {
      const id = getId(object);
      return write(acc, { [id]: object });
    },
    {}
  );
  const targetsById = reduce(
    targets,
    (acc, target) => {
      const id = getId(target);
      return write(acc, { [id]: target });
    },
    {}
  );

  /*
   * if our target association references match any of the objects by @id, simply assign them
   * this satisfies 'belongs_to', 'has_one' & 'HABTM' associations
   */
  each(targets, (target) => {
    const ref =
      get(target, `@associations[${assocName}]`) ||
      get(target, `$links[${assocName}]`);

    if (isArray(ref)) {
      const matches = pick(objectsById, ref);
      if (!isEmpty(matches))
        Object.defineProperty(target, assocName, { value: values(matches) });
    } else {
      const match = objectsById[ref];
      if (!isEmpty(match))
        Object.defineProperty(target, assocName, { value: match });
    }
  });

  /*
   * if any of our object association references point to one of our targets, assign them
   * this satifies 'has many' associations
   */
  each(objects, (object) => {
    const refs = get(object, "@associations") || get(object, "$links") || [];

    each(refs, (ref) => {
      const target = targetsById[ref as string];
      if (!isEmpty(target)) {
        const value = target[assocName];
        if (value && !isArray(value)) return; // already has a value which is not an array, abort.

        if (value) target[assocName].push(object);
        else Object.defineProperty(target, assocName, { value: [object] });
      }
    });
  });
};

export const assignToJsonSchema = (
  targets: IObject[],
  objects: IObject[],
  assocName: string,
  many: boolean,
  extractedProps: IExtractedProps
): void => {
  each(targets, (target) => {
    const props = extractedProps.propsByObject[target.$id];
    if (!props) return;

    const matches = filter(objects, (object) => {
      return every(props, (v, k) => {
        if (many && isArray(v)) {
          const values = map(v, toString);
          return includes(values, toString(object[k]));
        }
        else {
          return toString(object[k]) === toString(v)
        }
      })
    })

    target[assocName] = many ? matches : first(matches);
  })
};

export const assign = (
  targets: IObject[],
  objects: IObject[],
  assocName: string,
  many: boolean,
  extractedProps: IExtractedProps
): void => {
  if (get(targets, "[0].$schema")) {
    assignToJsonSchema(targets, objects, assocName, many, extractedProps);
  } else {
    assignToJsonLd(targets, objects, assocName);
  }

  assignEmpty(targets, assocName);
};
