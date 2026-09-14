import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from "axios";
import get from "lodash/get";
import each from "lodash/each";
import merge from "lodash/merge";
import isPlainObject from "lodash/isPlainObject";
import { stringify } from "querystringify";
import { IConfig } from "./config";
import { enqueueRequest, clearRequest } from "./watcher";

const trustedDomains = ["api.mediastore.com", "api.mediastore.dev", "api.nbcupassport.com", "api.nbcupassport.dev"];
const localHosts = ["localhost", "127.0.0.1", "[::1]"];

const validateUrl = (value: string): URL => {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`unsupported URL ${value}`); }
  const hostname = url.hostname.toLowerCase();
  const trusted = localHosts.includes(hostname) || trustedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
  if (!trusted || !["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error(`unsupported URL ${value}`);
  }
  return url;
};

const preventSSRF = (config: InternalAxiosRequestConfig) => {
  const url = validateUrl(config.url);
  // Axios's Node HTTP adapter invokes this before transmitting a redirected request.
  // An origin change must never forward MediaStore's custom identity headers.
  config.beforeRedirect = (options) => {
    const redirected = validateUrl(options.href);
    if (redirected.origin !== url.origin) throw new Error("unsupported redirect origin");
  };
  return config;
};

export interface IRequestError extends Error {
  message: string;
  text?: string;
  object?: any;
  url?: string;
  code?: 'ERR_CANCELED';
  status?: number;
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

  const instance = axios.create({
    headers: {}, // We'll set headers below
  });

  // SSRF prevention as a request interceptor
  instance.interceptors.request.use(preventSSRF);

  // Optionally add debug logging
  if (config.verbose) {
    // Add Axios request and response interceptors for logging
    instance.interceptors.request.use((cfg) => {
      console.info('Axios Request:', cfg);
      return cfg;
    });

    instance.interceptors.response.use((response) => {
      console.info('Axios Response:', response);
      return response;
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
  config: IConfig,
  method: string,
  url: string
): Promise<AxiosResponse> => {
  // Use a unique random key for each request
  const key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  enqueueRequest(key, req, config, method, url);
  try {
    const response = await req;
    return response;
  } catch (err: any) {
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
