import superagent, {
  Response,
  SuperAgentStatic,
  SuperAgentRequest,
} from "superagent";
import superdebug from "superdebug";
import get from "lodash/get";
import each from "lodash/each";
import merge from "lodash/merge";
import isPlainObject from "lodash/isPlainObject";
import { stringify } from "querystringify";
import { IConfig } from "./config";
import { enqueueRequest, clearRequest } from "./watcher";

const SSRFRegex = /api.nbcupassport|api.mediastore|localhost/i
const preventSSRF = (request) => {
  if (!get(request, 'url', '').match(SSRFRegex)) {
    throw Error(`unsupported URL ${request.url}`);
  }

  return request;
};

export interface IRequestError extends Error {
  message: string;
  status?: number;
  text?: string;
  object?: any;
  url?: string;
}

export const isNode = (): boolean => {
  return typeof window === "undefined";
};

export const request = (
  config: IConfig,
  headers?: { [s: string]: any }
): SuperAgentStatic => {
  const req = superagent.agent();

  if (config.verbose) req.use(superdebug(console.info));
  req.use(preventSSRF);

  headers = merge({}, config.headers, headers);

  each(headers, (value, key) => {
    if (!value) return;

    isPlainObject(value) ? req.set(key, stringify(value)) : req.set(key, value);
  });

  if (!isNode()) {
    req.set("X-Window-Location", get(window, "location.href", ""));
  }

  return req;
};

export const run = async (
  req: SuperAgentRequest,
  config: IConfig
): Promise<Response> => {
  const key =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  try {
    const promise = req;
    enqueueRequest(key, promise, config);

    return await promise;
  } catch (err) {
    const error = err as IRequestError;
    error.name = "RequestError";
    error.object = get(err, "response.body");
    error.text = get(err, "response.body.description") || err.message;
    error.url = get(req, "url");

    throw error;
  } finally {
    clearRequest(key, config);
  }
};
