import {
  get,
  first,
  reduce,
  includes,
  merge,
  cloneDeep,
  startsWith,
} from "lodash";
import { IConfig } from "./config";
import { request, run } from "./request";
import { set as cacheSet, get as cacheGet } from "./cache";
import { pending } from "./watcher";
import { getSpecUrl } from "./association";

const uriCheck = /https?:\/\//i;

export interface IProperty {
  type: string;
}

export interface IJsonLDProperty extends IProperty {
  readable: boolean;
  writable: boolean;
  exportable: boolean;
  required?: boolean;
  validations?: any[];
  collection?: boolean;
}

export interface IJsonSchemaProperty extends IProperty {
  enum?: any[];
  readonly?: boolean;
  uiType?: string;
  source?: string;
  items?: { [s: string]: string };
  [s: string]: any; // JSON Schema validation props..
}

export interface IAction {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  collection: boolean;
  template: string;
  mappings: { [s: string]: string }[];
  expects?: string;
  resource?: string;
  response?: string;
}

export interface ISpec {
  properties: { [s: string]: IProperty };
  associations: { [s: string]: IProperty };
  url: string;
  constants: { [s: string]: string[] | string | number | boolean };
  actions: { [s: string]: IAction };
  action: (name: string) => IAction;
}

export interface IJsonSchemaSpec extends ISpec {
  properties: { [s: string]: IJsonSchemaProperty };
  associations: { [s: string]: IJsonSchemaProperty };
}

export interface IJsonLDSpec extends ISpec {
  properties: { [s: string]: IJsonLDProperty };
  associations: { [s: string]: IJsonLDProperty };
  member_actions: IAction[];
  collection_actions: IAction[];
}

export const isJsonSchemaSpec = (spec: any): spec is IJsonSchemaSpec => {
  return get(spec, "url", "").includes("/schemas");
};

export const isJsonLDSpec = (spec: any): spec is IJsonLDSpec => {
  return get(spec, "url", "").includes("/context");
};

export const getSpec = async (
  urlOrAppModel,
  config: IConfig
): Promise<ISpec> => {
  let url;

  if (uriCheck.test(urlOrAppModel)) {
    url = first(urlOrAppModel.split("?"));
  } else {
    if (startsWith(urlOrAppModel, "mm3:")) {
      const [, appModel] = urlOrAppModel.split(":");
      const [app, model] = appModel.split(".");
      url = `${config.endpoints[app]}/v2021/schemas/${model}`;
    } else {
      const [app, model] = urlOrAppModel.split(".");
      url = includes(config.endpoints[app], "v20140601")
        ? `${config.endpoints[app]}/context/${model}`
        : `${config.endpoints[app]}/v20140601/context/${model}`;
    }
  }

  let spec;

  if (config.cache.enabled && config.cache.default) {
    const cached = cacheGet(url, { engine: config.cache.default }, config);
    if (cached) {
      spec = cloneDeep(cached) as ISpec;
    }
  }

  if (!spec) {
    let res, req;

    if ((req = pending(url, config))) {
      res = await req;
    } else {
      req = request(config).get(url);

      if (config.timestamp) req.query({ t: config.timestamp });

      res = await run(req, config);
    }

    spec = get(res, `body['@context']`) || get(res, "body");
    spec.url = url;

    if (config.cache.enabled && config.cache.default) {
      cacheSet(url, cloneDeep(spec), { engine: config.cache.default }, config);
    }
  }

  if (!spec) throw new Error(`Failed to fetch spec ${url}`);

  if (isJsonLDSpec(spec)) {
    spec.action = (actionName: string): IAction => {
      let action, type, name;

      name = actionName;
      if (includes(actionName, ".")) [type, name] = actionName.split(".");

      if (type !== "member" && spec.collection_actions[name]) {
        action = spec.collection_actions[name];
        action.collection = true;
      } else if (spec.member_actions[name]) {
        action = spec.member_actions[name];
        action.collection = false;
      }

      return action;
    };

    spec.associations = reduce(
      spec.properties,
      (assocs, prop, name) => {
        return uriCheck.test(prop.type)
          ? merge(assocs, { [name]: prop })
          : assocs;
      },
      {}
    );
  } else if (isJsonSchemaSpec(spec)) {
    spec.action = (actionName: string): IAction => {
      return spec.actions[actionName];
    };

    spec.associations = reduce(
      spec.properties,
      (assocs, prop, name) => {
        if (prop.anyOf && !prop['$jsonld_context']) {
          prop = first(prop.anyOf);
        }
        return getSpecUrl(prop) ? merge(assocs, { [name]: prop }) : assocs;
      },
      {}
    );
  }

  return spec;
};

export default getSpec;
