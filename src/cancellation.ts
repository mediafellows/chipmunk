import { IRequestError } from "./request";

export const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    const error: IRequestError = new Error("Request was aborted");
    error.name = "AbortError";
    error.code = "ERR_CANCELED";
    throw error;
  }
};

export const combineSignals = (
  actionSignal?: AbortSignal,
  configSignal?: AbortSignal,
): AbortSignal | undefined => {
  if (!actionSignal) return configSignal;
  if (!configSignal || actionSignal === configSignal) return actionSignal;
  return AbortSignal.any([actionSignal, configSignal]);
};
