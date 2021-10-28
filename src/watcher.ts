import { delay, isEmpty, get, find } from "lodash";

import { IConfig } from "./config";

export const next = (config: IConfig): void => {
  delay(() => {
    if (!isEmpty(config.watcher.pendingRequests)) return;

    const handler = config.watcher.performLaterHandlers.pop();
    handler && handler();
  }, 50);
};

export const enqueuePerformLater = (cb: Function, config: IConfig): void => {
  delay(() => {
    config.watcher.performLaterHandlers.push(cb);
    next(config);
  }, 50);
};

export const enqueueRequest = (
  key: string,
  payload: any,
  config: IConfig
): void => {
  config.watcher.pendingRequests[key] = payload;
};

export const clearRequest = (key: string, config: IConfig): void => {
  delete config.watcher.pendingRequests[key];
  next(config);
};

export const pending = (url: string, config: IConfig): any => {
  const match = find(config.watcher.pendingRequests, (request) => {
    return request.method === "GET" && request.url === url;
  });
  return match;
};
