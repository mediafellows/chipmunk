import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from "axios";
import superdebug from "superdebug";
import get from "lodash/get";
import each from "lodash/each";
import merge from "lodash/merge";
import isPlainObject from "lodash/isPlainObject";
import { stringify } from "querystringify";
import { IConfig } from "./config";
import { enqueueRequest, clearRequest } from "./watcher";

const SSRFRegex = /api.nbcupassport|api.mediastore|localhost/i;
const preventSSRF = (config: InternalAxiosRequestConfig) => {
  if (!get(config, 'url', '').match(SSRFRegex)) {
    throw Error(`unsupported URL ${config.url}`);
  }
  return config;
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
): AxiosInstance => {
  // Merge headers
  headers = merge({}, config.headers, headers);

  // Create axios instance with validateStatus to always resolve
  const instance = axios.create({
    validateStatus: () => true,
    headers: {}, // We'll set headers below
  });

  // SSRF prevention as a request interceptor
  instance.interceptors.request.use(preventSSRF);

  // Optionally add debug logging
  if (config.verbose) {
    // No direct axios equivalent for superdebug, but you can add a logging interceptor
    instance.interceptors.request.use((cfg) => {
      superdebug(console.info)(cfg);
      return cfg;
    });
  }

  // Set headers
  each(headers, (value, key) => {
    if (!value) return;
    instance.defaults.headers.common[key] = isPlainObject(value)
      ? stringify(value)
      : value;
  });

  if (!isNode()) {
    instance.defaults.headers.common["X-Window-Location"] = get(window, "location.href", "");
  }

  return instance;
};

function isAxiosError(error: any): error is AxiosError {
  return error && error.isAxiosError;
}

export const run = async (
  req: Promise<AxiosResponse>,
  config: IConfig
): Promise<AxiosResponse> => {
  const key =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  try {
    enqueueRequest(key, req, config);
    const response = await req;
    // Always resolve, even for non-2xx (handled by validateStatus)
    return response;
  } catch (err: any) {
    // Only network errors or aborts should throw
    const error: IRequestError = err;
    if (error.name === "AbortError" || (isAxiosError(error) && error.code === "ERR_CANCELED")) {
      error.message = "Request was aborted";
    } else {
      error.name = "RequestError";
    }
    error.object = get(err, "response.data");
    error.text = get(err, "response.data.description") || err.message;
    error.url = get(err, "config.url");
    throw error;
  } finally {
    clearRequest(key, config);
  }
};
