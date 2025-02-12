import merge from "lodash/merge";
import get from "lodash/get";
import cloneDeep from "lodash/cloneDeep";
import omit from "lodash/omit";
import { IRequestError } from "./request";

export interface IHeaderSettings {
  "Session-Id"?: string | null;
  "Affiliation-Id"?: string | null;
  "Accept"?: string | null;
  Origin?: string;
  "Role-Id"?: number | string | null;
  "Visitor-Id"?: string | null;
  "Mpx-Flavours"?: { [s: string]: any };
}

export interface ICacheSettings {
  enabled?: boolean;
  default?: "runtime" | "storage" | null;
  prefix?: string;
}

export interface IWatcher {
  pendingRequests: { [s: string]: any };
  performLaterHandlers: Function[];
}

export interface IConfig {
  endpoints?: { [s: string]: string };
  headers?: IHeaderSettings;
  errorInterceptor?(err: IRequestError): boolean;
  defaultErrorHandler?(err: IRequestError): boolean;
  verbose?: boolean;
  cache?: ICacheSettings;
  watcher?: IWatcher;
  timestamp?: number;
}

const DEFAULTS: IConfig = {
  endpoints: {},
  timestamp: (Date.now() / 1000) | 0,
  headers: {
    "Mpx-Flavours": {},
    "Accept": "application/json"
  },
  verbose: false,
  cache: {
    default: null,
    prefix: "anonymous",
    enabled: false,
  },
  watcher: {
    pendingRequests: {},
    performLaterHandlers: [],
  },
  errorInterceptor: null,
  defaultErrorHandler: null
};

export const cleanConfig = (config: IConfig): Partial<IConfig> => {
  return omit(config, "errorInterceptor", "verbose", "cache", "watcher");
};

export default (...configs: Partial<IConfig>[]): IConfig => {
  const conf = cloneDeep(configs);
  conf.unshift({}, DEFAULTS);
  const result = merge.apply(null, conf);

  if (
    get(result, `headers['Affiliation-Id']`) &&
    get(result, `headers['Role-Id']`)
  ) {
    result.cache.prefix = `${result.headers["Affiliation-Id"]}-${result.headers["Role-Id"]}`;
  } else if (get(result, `headers['Role-Id']`)) {
    result.cache.prefix = result.headers["Role-Id"];
  } else if (get(result, `headers['Session-Id']`)) {
    result.cache.prefix = result.headers["Session-Id"];
  }

  return result;
};
