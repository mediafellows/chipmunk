import { merge, delay } from "lodash";

import getSpec, { ISpec } from "./spec";
import action, { IResult, IActionOpts } from "./action";
import unfurl from "./unfurl";
import { fetch, assign } from "./association";
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
  action(
    appModel: string,
    actionName: string,
    opts?: IActionOpts
  ): Promise<IResult>;
  unfurl(
    appModel: string,
    actionName: string,
    opts?: IActionOpts
  ): Promise<IResult>;
  fetch(objects: any[], name: string): Promise<IResult>;
  assign(targets: any[], objects: any[], name: string): void;
  fetchAndAssign(targets: any[], name: string): Promise<void>;
  performLater(cb: Function): void;
  cache: ICache;
}

export { ISpec, IResult, IConfig, IActionOpts, cleanConfig };

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
    action: (appModel, actionName, opts = {}) =>
      action(appModel, actionName, opts, config),
    unfurl: (appModel, actionName, opts = {}) =>
      unfurl(appModel, actionName, opts, config),
    fetch: (objects, name) => fetch(objects, name, config),
    assign: (targets, objects, name) => assign(targets, objects, name, config),
    fetchAndAssign: async (targets, name) => {
      const result = await fetch(targets, name, config);
      assign(targets, result.objects, name, config);
    },
    cache: {
      set: (key, value, opts) => set(key, value, callOpts(opts), config),
      get: (key, opts) => get(key, callOpts(opts), config),
      remove: (key, opts) => remove(key, callOpts(opts), config),
      update: (key, cb, opts) => update(key, cb, callOpts(opts), config),
      clear: (opts) => clear(callOpts(opts)),
    },
    performLater: (cb) => enqueuePerformLater(cb, config),
  };

  const run = async (block, errorHandler?) => {
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
