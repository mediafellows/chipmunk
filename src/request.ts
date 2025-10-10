import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from "axios";
import get from "lodash/get";
import reduce from "lodash/reduce";
import isPlainObject from "lodash/isPlainObject";
import { stringify } from "querystringify";
import { IConfig } from "./config";
import { enqueueRequest, clearRequest } from "./watcher";

export const isNode = typeof window === 'undefined';

let http, https;
if (isNode) {
  http = require('http');
  https = require('https');
}

const SSRFRegex = /api.nbcupassport|api.mediastore|localhost/i;
const preventSSRF = (config: InternalAxiosRequestConfig) => {
  if (!get(config, 'url', '').match(SSRFRegex)) {
    throw Error(`unsupported URL ${config.url}`);
  }
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

export const formatHeaders = (headers) => {
  return reduce(
    headers,
    (acc, value, key) => {
      if (!value) return acc;

      acc[key] = isPlainObject(value)
        ? stringify(value)
        : value;

      return acc;
    }, 
    {}
  );
}

let axiosInstance: AxiosInstance = null;
export const request = (
  config: IConfig,
): AxiosInstance => {
  if (isNode && axiosInstance) return axiosInstance;

  let instance: AxiosInstance;
  if (isNode) {
    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({ keepAlive: true });
    instance = axios.create({
      headers: {},
      httpAgent: httpAgent,
      httpsAgent: httpsAgent,
    });
  } else {
    instance = axios.create({
      headers: {},
    });
  }

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

  if (isNode) axiosInstance = instance;
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
