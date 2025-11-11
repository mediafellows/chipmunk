import UriTemplate from "uri-templates";

import write from "lodash/assign";
import each from "lodash/each";
import includes from "lodash/includes";
import uniq from "lodash/uniq";
import flatten from "lodash/flatten";
import omit from "lodash/omit";
import pick from "lodash/pick";
import keys from "lodash/keys";
import reduce from "lodash/reduce";
import filter from "lodash/filter";
import get from "lodash/get";
import merge from "lodash/merge";
import first from "lodash/first";
import map from "lodash/map";
import isArray from "lodash/isArray";
import isEmpty from "lodash/isEmpty";
import isPlainObject from "lodash/isPlainObject";

import { IConfig, cleanConfig } from "./config";
import { request, run, isNode, formatHeaders } from "./request";
import getSpec, { IAction } from "./spec";
import format from "./format";
import parseSchema from "./schema";
import { fetch, assign, assignEmpty } from "./association";
import { handleFileDownload, isDownloadFileRequest } from "./file-utils";
import log from "./log";

export interface IActionOpts {
  // returns raw data, without moving association references, does not support schema resolving
  raw?: boolean;
  // if enabled, this request is routed via tuco
  proxy?: boolean;
  // legacy: for core models: indicates, if provided, that the array body should be converted into hash, where 'id' is the key of each
  multi?: boolean;
  // legacy, for core models: converts to ruby on rails accepts nested attributes compatible body
  ROR?: boolean;

  headers?: { [s: string]: any };
  body?: { [s: string]: any };
  params?: { [s: string]: any };
  schema?: string;
  signal?: AbortSignal;
  isFileDownload?: boolean;
}

export interface IObject {
  "@associations"?: { [s: string]: any };
  $links?: { [s: string]: any };
  [s: string]: any;
}

export interface IPagination {
  total_pages: number;
  total_count: number;
  current_page: number;
}

export interface IResult<T=IObject> {
  object: T;
  objects: T[];
  pagination?: IPagination;
  type?: string;
  headers?: { [s: string]: string };
  aggregations?: any;
}

const DEFAULT_OPTS: IActionOpts = {
  ROR: false,
  raw: false,
  proxy: false,
  multi: false,
  params: {},
  isFileDownload: false,
};

const PAGINATION_PROPS = ["total_pages", "total_count", "current_page"];

const extractParamsFromBody = (
  action: IAction,
  body = {}
): { [s: string]: any } => {
  const result = {};

  each(action.mappings || [], (mapping) => {
    if (body[mapping.source]) result[mapping.variable] = body[mapping.source];
  });

  return result;
};

const validateParams = (action: IAction, params, config): boolean => {
  const required = filter(action.mappings, "required");

  for (let index in required) {
    const variable = get(required[index], "variable");

    if (!params[variable]) {
      const msg = `Required param '${variable}' for '${action.template}' missing!`;
      if (config.verbose) console.error(msg);
      else log(msg);

      return false;
    }
  }

  return true;
};

function checkAborted(signal?: AbortSignal, configSignal?: AbortSignal) {
  if (signal?.aborted || configSignal?.aborted) {
    throw new Error("Request was aborted");
  }
}

const resolve = async (objects, schema, config, signal?: AbortSignal) => {
  if (isEmpty(objects)) return [];
  if (schema === "*") return objects;

  // Check if aborted before proceeding
  checkAborted(signal, config.signal);

  merge(schema, {
    "@id": true,
    "@context": true,
    "@type": true,
    "@associations": true,
    $id: true,
    $schema: true,
    $links: true,
  });

  const refs = uniq(
    flatten(
      map(objects, (x) => {
        return x["$schema"] ? keys(x["$links"]) : keys(x["@associations"]);
      })
    )
  );

  const associations = reduce(
    schema,
    (acc, val, key) => {
      // if there is no reference, we can't resolve it
      if (!includes(refs, key)) return acc;

      if (isPlainObject(val)) {
        return merge(acc, { [key]: val });
      } else {
        return merge(acc, { [key]: "*" });
      }
    },
    {}
  );

  const promises = map(associations, async (assocSchema, assocName) => {
    try {
      // Check if aborted before each association fetch
      checkAborted(signal, config.signal);

      const result = await fetch(objects, assocName, config);

      // first add props needed for the assignments later to the schema
      const neededProps = keys(result.extractedProps.allProps);
      reduce(neededProps, (acc, prop) => write(acc, { [prop]: true }), assocSchema)

      const resolved = await resolve(result.objects, assocSchema, config, signal);

      // assign results to the target objects that were associating them
      await assign(objects, resolved, assocName, result.many, result.extractedProps);
    } catch (err) {
      // if we fail to resolve an association, continue anyways
      assignEmpty(objects, assocName);
      log(`failed to resolve association ${assocName}`);
      if (config.verbose) log(err, objects, schema);
      return objects;
    }
  });

  await Promise.all(promises);
  const result = map(objects, (o) => pick(o, keys(schema)));
  return result;
};

const performAction = async <T>(
  appModel: string,
  actionName: string,
  opts: IActionOpts,
  config: IConfig
): Promise<IResult<T>> => {
  // Short-circuit if already aborted
  checkAborted(opts.signal, config.signal);

  const requestHeaders = formatHeaders(merge({}, config.headers, opts.headers));
  if (!isNode) {
    requestHeaders['X-Window-Location'] = get(window, "location.href", "")
  }
  
  const spec = await getSpec(appModel, config);
  const action = spec.action(actionName);
  const isBodyFormData = opts.body instanceof FormData;
  // Don't format the body if it's already FormData
  const body = isBodyFormData ? opts.body : format(opts.body, opts.multi, opts.ROR);  
  const uriTemplate = UriTemplate(action.template);
  const params = merge(
    {},
    // Skip extracting params from FormData
    isBodyFormData ? {} : extractParamsFromBody(action, body),
    // additionally also treat params like a body, to convert back 'object'-props (source) into template params
    // helps when template variables don't match, like
    // e.g. collection get: '/assets/{asset_id}/products/{product_ids}' and collection query: '/assets/{asset_ids}/products
    //                                                                          ^^ asset_id vs asset_ids
    extractParamsFromBody(action, opts.params),
    opts.params
  );

  validateParams(action, params, config);

  const uri = uriTemplate.fillFromObject(params);

  let req;

  const axiosOptions: any = {
    signal: opts.signal || config.signal,
    headers: requestHeaders,
  };
  if (config.timestamp) {
    axiosOptions.params = { t: config.timestamp };
  }

  if (opts.isFileDownload) {
    axiosOptions.responseType = 'blob';
  }
  
  switch (action.method) {
    case "POST":
      req = request(config).post(uri, body, axiosOptions);
      break;
    case "PUT":
      req = request(config).put(uri, body, axiosOptions);
      break;
    case "PATCH":
      req = request(config).patch(uri, body, axiosOptions);
      break;
    case "DELETE":
      req = request(config).delete(uri, { data: body, ...axiosOptions });
      break;
    default:
      req = request(config).get(uri, axiosOptions);
  }
  
  const response = await run(req, config, action.method, uri);
  const headers = get(response, "headers", {});

  // Handle file downloads
  if (isDownloadFileRequest(headers)) {
    const body = get(response, "data", {});
    return handleFileDownload(headers, body) as IResult<T>;
  }

  let objects = [];

  if (get(response, "data.members")) objects = response.data.members;
  else if (!isEmpty(response.data)) objects = [response.data];

  if (!opts.raw) {
    // objects can have different context, e.g. series vs seasons vs episodes
    // for this reason we have to check all possible contexts for association definitions

    const promises = map(objects, async (object) => {
      if (!object["@context"]) return; // skip non JSONLD objects

      const objectSpec = await getSpec(object["@context"], config);
      object["@associations"] = {};

      each(objectSpec.associations, (_def, name) => {
        const data = object[name];

        if (data) {
          object["@associations"][name] = isArray(data)
            ? map(data, "@id")
            : get(data, "@id");
        }

        object[name] = null; // initialize association data with null
      });
    });

    await Promise.all(promises);
  }

  if (!opts.raw && !isEmpty(opts.schema)) {
    const schema = parseSchema(opts.schema);
    objects = await resolve(objects, schema, config, opts.signal);
  }

  const result: IResult<T> = {
    objects,
    get object() {
      return first(objects);
    },
    headers: get(response, "data.headers", {}) as any,
    type: get(response, `data['@type']`),
  };

  if (get(response, "data.aggregations")) {
    if (opts.raw) {
      result.aggregations = response.data.aggregations;
    }
    else {
      result.aggregations = reduce(
        response.data.aggregations,
        (acc, agg, name) => {
          acc[name] = map(get(agg, "buckets"), (tranche) => ({
            value: tranche.key,
            count: tranche.doc_count,
          }));
          return acc;
        },
        {}
      );
    }
  }

  if (get(response, `data['total_count']`) || get(response, `data['@total_count']`)) {
    result.pagination = {} as IPagination;

    each(PAGINATION_PROPS, (prop) => {
      if (response.data[prop]) {
        result.pagination[prop] = response.data[prop];
      }
      else if (response.data[`@${prop}`]) {
        result.pagination[prop] = response.data[`@${prop}`];
      }
    });
  }

  return result;
};

const performProxiedAction = async <T>(
  appModel: string,
  actionName: string,
  opts: IActionOpts,
  config: IConfig
): Promise<IResult<T>> => {
  const spec = await getSpec("tuco.request", config);
  const action = spec.action("proxy");
  const cleanedConfig = omit(cleanConfig(config), 'endpoints');

  const body = {
    appModel,
    actionName,
    opts: omit(opts, "proxy"),
    config: cleanedConfig,
  };

  const debugParams = `?m=${appModel}&a=${actionName}`;
  const url = action.template + debugParams;
  const req = request(config).post(url, body);

  const response = await run(req, config, "POST", url);
  const objects = get(response, "data.objects", []) as T[];

  const result: IResult<T> = {
    objects: objects,
    get object() {
      return first(objects);
    },
    headers: get(response, "data.headers", {}),
    type: get(response, "data.type"),
    aggregations: get(response, "data.aggregations"),
    pagination: get(response, "data.pagination"),
  };

  return result;
};

export default async <T>(
  appModel: string,
  actionName: string,
  opts: IActionOpts,
  config: IConfig
): Promise<IResult<T>> => {
  opts = merge({}, DEFAULT_OPTS, { proxy: !isEmpty(opts.schema) && !isNode }, opts);

  if (opts.proxy && isEmpty(opts.schema)) {
    throw new Error("Proxying is supported only if a schema is given, too.");
  }

  return opts.proxy
    ? performProxiedAction(appModel, actionName, opts, config)
    : performAction(appModel, actionName, opts, config);
};
