import merge from "lodash/merge";

import getSpec, {
  ISpec,
  IJsonLDSpec,
  IJsonSchemaSpec,
  IProperty,
  IJsonLDProperty,
  IJsonSchemaProperty,
  isJsonLDSpec,
  isJsonSchemaSpec,
} from "./spec";
import action, { IResult, IActionOpts, IObject } from "./action";
import unfurl from "./unfurl";
import createConfig, { IConfig, cleanConfig } from "./config";
import {
  ICallOpts,
  ISetOpts,
  IUpdateOpts,
  get,
  set,
  remove,
  update,
  clear,
} from "./cache";
import { enqueuePerformLater } from "./watcher";

export * from "./cache";
export { IRequestError } from './request';

export interface ICache {
  set(key: string, value: any, opts?: ISetOpts): void;
  get(key: string, opts?: ICallOpts): any;
  remove(key: string, opts?: ICallOpts): void;
  update(key: string, cb: (any) => any, opts?: IUpdateOpts): any;
  clear(opts?: ICallOpts): void;
}

export interface IInterface {
  currentConfig(): IConfig;
  updateConfig(overrides?: Partial<IConfig>): IConfig;
  context(urlOrAppModel: string): Promise<ISpec>;
  spec(urlOrAppModel: string): Promise<ISpec>;
  action<T extends IObject = IObject>(
    appModel: string,
    actionName: string,
    opts?: IActionOpts
  ): Promise<IResult<T>>;
  unfurl<T extends IObject = IObject>(
    appModel: string,
    actionName: string,
    opts?: IActionOpts
  ): Promise<IResult<T>>;
  performLater(cb: Function): void;
  cache: ICache;
}

export {
  ISpec,
  IJsonLDSpec,
  IJsonSchemaSpec,
  isJsonSchemaSpec,
  isJsonLDSpec,
  IProperty,
  IJsonLDProperty,
  IJsonSchemaProperty,
};

export { IResult, IConfig, IActionOpts, cleanConfig };

export interface IChipmunk extends IInterface {
  run: (
    block: (ch: IInterface) => Promise<any>,
    errorHandler?: Function
  ) => Promise<any>;
}

export default (...overrides: Partial<IConfig>[]): IChipmunk => {
  let config = createConfig.apply(null, overrides);

  const callOpts = (opts) => merge({ engine: config.cache.default }, opts);

  const ch = {
    currentConfig: () => config,
    updateConfig: (overrides) => {
      return (config = createConfig(config, overrides));
    },
    context: (urlOrAppModel) => getSpec(urlOrAppModel, config),
    spec: (urlOrAppModel) => getSpec(urlOrAppModel, config),
    action: <T extends IObject=IObject>(appModel, actionName, opts = {}): Promise<IResult<T>> =>
      action<T>(appModel, actionName, opts, config),
    unfurl: <T extends IObject=IObject>(appModel, actionName, opts = {}): Promise<IResult<T>> =>
      unfurl<T>(appModel, actionName, opts, config),
    cache: {
      set: (key, value, opts) => set(key, value, callOpts(opts), config),
      get: (key, opts) => get(key, callOpts(opts), config),
      remove: (key, opts) => remove(key, callOpts(opts), config),
      update: (key, cb, opts) => update(key, cb, callOpts(opts), config),
      clear: (opts) => clear(callOpts(opts)),
    },
    performLater: (cb) => enqueuePerformLater(cb, config),
  };

  const run = async (block, errorHandler = config.defaultErrorHandler) => {
    try {
      return await block(ch);
    } catch (e) {
      if (config.errorInterceptor) {
        if (config.errorInterceptor(e) === true) return;
      }

      if (errorHandler) return errorHandler(e);

      throw e;
    }
  };

  return {
    run,
    ...ch,
  };
};
