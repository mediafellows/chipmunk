import { IRequestError } from './request';
export interface IHeaderSettings {
    'Session-Id'?: string;
    'Affiliation-Id'?: string;
    'Role-Id'?: any;
    'Visitor-Id'?: string;
    'Mpx-Flavours'?: {
        [s: string]: any;
    };
}
export interface ICacheSettings {
    enabled?: boolean;
    default?: 'runtime' | 'storage' | null;
    prefix?: string;
}
export interface IWatcher {
    pendingRequests: {
        [s: string]: any;
    };
    performLaterHandlers: Function[];
}
export interface IConfig {
    endpoints?: {
        [s: string]: string;
    };
    headers?: IHeaderSettings;
    errorInterceptor?(err: IRequestError): boolean;
    verbose?: boolean;
    cache?: ICacheSettings;
    watcher?: IWatcher;
    timestamp?: number;
}
export declare const cleanConfig: (config: IConfig) => Partial<IConfig>;
declare const _default: (...configs: Partial<IConfig>[]) => IConfig;
export default _default;
