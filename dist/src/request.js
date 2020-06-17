"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const superagent_1 = __importDefault(require("superagent"));
const superdebug_1 = __importDefault(require("superdebug"));
const nanoid_1 = __importDefault(require("nanoid"));
const lodash_1 = require("lodash");
const querystringify_1 = require("querystringify");
const watcher_1 = require("./watcher");
exports.isNode = () => {
    return typeof window === 'undefined';
};
exports.request = (config, headers) => {
    const req = superagent_1.default.agent();
    if (config.verbose)
        req.use(superdebug_1.default(console.info));
    headers = lodash_1.merge({}, config.headers, headers);
    lodash_1.each(headers, (value, key) => {
        if (!value)
            return;
        lodash_1.isPlainObject(value) ?
            req.set(key, querystringify_1.stringify(value)) :
            req.set(key, value);
    });
    return req;
};
exports.run = (req, config) => __awaiter(this, void 0, void 0, function* () {
    const key = nanoid_1.default();
    try {
        const promise = req;
        watcher_1.enqueueRequest(key, promise, config);
        return yield promise;
    }
    catch (err) {
        const error = err;
        error.name = 'RequestError';
        error.object = lodash_1.get(err, 'response.body');
        error.text = lodash_1.get(err, 'response.body.description') || err.message;
        error.url = lodash_1.get(req, 'url');
        throw error;
    }
    finally {
        watcher_1.clearRequest(key, config);
    }
});
//# sourceMappingURL=request.js.map