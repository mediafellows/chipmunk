import { IConfig } from "./config";
import startsWith from "lodash/startsWith";
import each from "lodash/each";
import merge from "lodash/merge";
import { isNode } from "./request";

const PREFIX = "chipmunk";
const DEFAULT_EXPIRY = 60;


if (!isNode()) {
	// remove all expired entries
	const nowDate = Date.now();
	for (const key of Object.keys(localStorage).filter(k => k.startsWith(`${PREFIX}-`))) {
		try {
			const valueStr = localStorage.getItem(key);
			if (typeof valueStr !== 'string') continue;
			const expires = JSON.parse(valueStr)?.expires;
			if (!Number.isInteger(expires)) continue;
			if (nowDate <= expires) continue;
			localStorage.removeItem(key);
		} catch (e) {}
	}
}

const minutesFromNow = (min: number): number => {
  return Date.now() + min * 60000;
};

export let _runtimeCache = {};

export const runtimeFetch = (key: string): any => {
  const obj = _runtimeCache[key];

  if (obj && Date.now() > obj.expires) {
    runtimeDrop(key);
    return null;
  }

  return obj && obj.value;
};

export const runtimePut = (key: string, value: any, expires?: number): void => {
  expires = minutesFromNow(expires || DEFAULT_EXPIRY);

  const obj = { value, expires };
  _runtimeCache[key] = obj;
};

export const runtimeDrop = (key: string): void => {
  const keyparts = key.split("*");

  if (keyparts.length > 1) {
    const toDelete = [];

    each(_runtimeCache, (_val, key) => {
      if (startsWith(key, keyparts[0])) toDelete.push(key);
    });

    each(toDelete, (key) => delete _runtimeCache[key]);
  } else {
    delete _runtimeCache[key];
  }
};

export const runtimeClear = (): void => {
  _runtimeCache = {};
};

export const storageFetch = (key: string): any => {
  const { localStorage } = window;
  key = `${PREFIX}-${key}`;

  const obj = JSON.parse(localStorage.getItem(key) || null);

  if (obj && Date.now() > obj.expires) {
    storageDrop(key);
    return null;
  }

  return obj && obj.value;
};

export const storagePut = (key: string, value: any, expires?: number): void => {
  const { localStorage } = window;
  key = `${PREFIX}-${key}`;
  expires = minutesFromNow(expires || DEFAULT_EXPIRY);

  const obj = { value, expires };
  localStorage.setItem(key, JSON.stringify(obj));
};

export const storageDrop = (key: string): void => {
  const { localStorage } = window;
  key = `${PREFIX}-${key}`;
  const keyparts = key.split("*");

  if (keyparts.length > 1) {
    const toDelete = [];

    for (var i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (startsWith(key, keyparts[0])) toDelete.push(key);
    }

    each(toDelete, (key) => localStorage.removeItem(key));
  } else {
    localStorage.removeItem(key);
  }
};

export const storageClear = (): void => {
  const { localStorage } = window;
  const toDelete = [];

  for (var i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (startsWith(key, PREFIX)) toDelete.push(key);
  }

  each(toDelete, (key) => localStorage.removeItem(key));
};

export interface ICallOpts {
  engine: "runtime" | "storage";
  noPrefix: boolean;
}

const defaultCallOpts: ICallOpts = {
  engine: "runtime",
  noPrefix: false,
};

export interface ISetOpts extends ICallOpts {
  expires: number;
}

export interface IUpdateOpts extends ICallOpts {
  expires: number;
  defaultValue: any;
}

export const set = (
  key: string,
  value: any,
  opts: Partial<ISetOpts>,
  config: IConfig
): void => {
  opts = merge({ expires: DEFAULT_EXPIRY }, defaultCallOpts, opts);
  key = opts.noPrefix ? key : `${config.cache.prefix}-${key}`;
  const putFn = opts.engine === "storage" ? storagePut : runtimePut;

  return putFn(key, value, opts.expires);
};

export const get = (
  key: string,
  opts: Partial<ICallOpts>,
  config: IConfig
): any => {
  opts = merge({}, defaultCallOpts, opts);
  key = opts.noPrefix ? key : `${config.cache.prefix}-${key}`;
  const fetchFn = opts.engine === "storage" ? storageFetch : runtimeFetch;

  return fetchFn(key);
};

export const remove = (
  key: string,
  opts: Partial<ICallOpts>,
  config: IConfig
): any => {
  opts = merge({}, defaultCallOpts, opts);
  key = opts.noPrefix ? key : `${config.cache.prefix}-${key}`;
  const dropFn = opts.engine === "storage" ? storageDrop : runtimeDrop;

  return dropFn(key);
};

export const update = (
  key: string,
  cb: (any) => any,
  opts: Partial<IUpdateOpts>,
  config: IConfig
): any => {
  opts = merge({ expires: DEFAULT_EXPIRY }, defaultCallOpts, opts);
  key = opts.noPrefix ? key : `${config.cache.prefix}-${key}`;
  const fetchFn = opts.engine === "storage" ? storageFetch : runtimeFetch;
  const putFn = opts.engine === "storage" ? storagePut : runtimePut;

  const currentValue = fetchFn(key) || opts.defaultValue;
  const value = cb(currentValue);
  return putFn(key, value, opts.expires);
};

export const clear = (opts: Partial<ICallOpts>): void => {
  opts = merge({}, defaultCallOpts, opts);
  const clearFn = opts.engine === "storage" ? storageClear : runtimeClear;

  return clearFn();
};
