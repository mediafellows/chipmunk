"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const request_1 = require("./request");
const cache_1 = require("./cache");
const watcher_1 = require("./watcher");
const uriCheck = /https?:\/\//i;
exports.default = (urlOrAppModel, config) => __awaiter(this, void 0, void 0, function* () {
    let url;
    if (uriCheck.test(urlOrAppModel)) {
        url = lodash_1.first(urlOrAppModel.split('?'));
    }
    else {
        const [app, model] = urlOrAppModel.split('.');
        url = `${config.endpoints[app]}/context/${model}`;
    }
    let context;
    if (config.cache.enabled && config.cache.default) {
        const cached = cache_1.get(url, { engine: config.cache.default }, config);
        if (cached)
            context = lodash_1.cloneDeep(cached);
    }
    if (!context) {
        let res;
        if (watcher_1.pending(url, config)) {
            res = yield watcher_1.pending(url, config);
        }
        else {
            const req = request_1.request(config)
                .get(url);
            if (config.timestamp)
                req.query({ t: config.timestamp });
            res = yield request_1.run(req, config);
        }
        context = lodash_1.get(res, `body['@context']`);
    }
    if (!context)
        throw new Error(`Failed to fetch context ${urlOrAppModel}`);
    if (config.cache.enabled && config.cache.default) {
        cache_1.set(url, lodash_1.cloneDeep(context), { engine: config.cache.default }, config);
    }
    context.action = (actionName) => {
        let action, type, name;
        name = actionName;
        if (lodash_1.includes(actionName, '.'))
            [type, name] = actionName.split('.');
        if (type !== 'member' && context.collection_actions[name]) {
            action = context.collection_actions[name];
            action.collection = true;
        }
        else if (context.member_actions[name]) {
            action = context.member_actions[name];
            action.collection = false;
        }
        return action;
    };
    context.associations = lodash_1.reduce(context.properties, (assocs, prop, name) => {
        return uriCheck.test(prop.type) ? lodash_1.merge(assocs, { [name]: prop }) : assocs;
    }, {});
    return context;
});
//# sourceMappingURL=context.js.map