import superagent from 'superagent';
import { IConfig } from './config';
export interface IRequestError extends Error {
    message: string;
    status?: number;
    text?: string;
    object?: any;
    url?: string;
}
export declare const isNode: () => boolean;
export declare const request: (config: IConfig, headers?: {
    [s: string]: any;
}) => superagent.SuperAgentStatic;
export declare const run: (req: superagent.SuperAgentRequest, config: IConfig) => Promise<superagent.Response>;
