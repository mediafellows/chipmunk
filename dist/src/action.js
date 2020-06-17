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
const uri_templates_1 = __importDefault(require("uri-templates"));
const lodash_1 = require("lodash");
const config_1 = require("./config");
const request_1 = require("./request");
const context_1 = __importDefault(require("./context"));
const format_1 = __importDefault(require("./format"));
const schema_1 = __importDefault(require("./schema"));
const association_1 = require("./association");
const log_1 = __importDefault(require("./log"));
class NotLoadedError extends Error {
}
exports.NotLoadedError = NotLoadedError;
const DEFAULT_OPTS = {
    ROR: false,
    raw: false,
    proxy: false,
    multi: false,
    params: {},
};
const PAGINATION_PROPS = ['@total_pages', '@total_count', '@current_page'];
const extractParamsFromBody = (action, body = {}) => {
    const result = {};
    lodash_1.each(action.mappings || [], (mapping) => {
        if (body[mapping.source])
            result[mapping.variable] = body[mapping.source];
    });
    return result;
};
const validateParams = (action, params, config) => {
    const required = lodash_1.filter(action.mappings, 'required');
    for (let index in required) {
        const variable = lodash_1.get(required[index], 'variable');
        if (!params[variable]) {
            const msg = `Required param '${variable}' for '${action.template}' missing!`;
            if (config.verbose)
                console.error(msg);
            else
                log_1.default(msg);
            return false;
        }
    }
    return true;
};
const resolve = (objects, schema, config) => __awaiter(this, void 0, void 0, function* () {
    if (lodash_1.isEmpty(objects))
        return [];
    if (schema === '*')
        return objects;
    lodash_1.merge(schema, {
        '@context': true,
        '@id': true,
        '@type': true,
        '@associations': true,
    });
    const refs = lodash_1.uniq(lodash_1.flatten(lodash_1.map(objects, x => lodash_1.keys(x['@associations']))));
    const associations = lodash_1.reduce(schema, (acc, val, key) => {
        if (lodash_1.isPlainObject(val)) {
            return lodash_1.merge(acc, { [key]: val });
        }
        else if (lodash_1.includes(refs, key)) {
            return lodash_1.merge(acc, { [key]: '*' });
        }
        else {
            return acc;
        }
    }, {});
    const promises = lodash_1.map(associations, (assocSchema, assocName) => __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield association_1.fetch(objects, assocName, config);
            const resolved = yield resolve(result.objects, assocSchema, config);
            association_1.assign(objects, resolved, assocName, config);
        }
        catch (err) {
            association_1.assign(objects, [], assocName, config);
            log_1.default(`failed to resolve association ${assocName}`);
            log_1.default(err, objects, schema);
            if (config.verbose)
                log_1.default(err, objects, schema);
            return objects;
        }
    }));
    yield Promise.all(promises);
    return lodash_1.map(objects, (o) => lodash_1.pick(o, lodash_1.keys(schema)));
});
const performAction = (appModel, actionName, opts, config) => __awaiter(this, void 0, void 0, function* () {
    const context = yield context_1.default(appModel, config);
    const action = context.action(actionName);
    const body = format_1.default(opts.body, opts.multi, opts.ROR);
    const uriTemplate = uri_templates_1.default(action.template);
    const params = lodash_1.merge({}, extractParamsFromBody(action, body), extractParamsFromBody(action, opts.params), opts.params);
    validateParams(action, params, config);
    const uri = uriTemplate.fillFromObject(params);
    let req;
    switch (action.method) {
        case 'POST':
            req = request_1.request(config, opts.headers)
                .post(uri)
                .send(body);
            break;
        case 'PUT':
            req = request_1.request(config, opts.headers)
                .put(uri)
                .send(body);
            break;
        case 'PATCH':
            req = request_1.request(config, opts.headers)
                .patch(uri)
                .send(body);
            break;
        case 'DELETE':
            req = request_1.request(config, opts.headers)
                .delete(uri);
            break;
        default:
            req = request_1.request(config, opts.headers)
                .get(uri);
    }
    if (config.timestamp)
        req.query({ t: config.timestamp });
    const response = yield request_1.run(req, config);
    let objects = [];
    if (lodash_1.get(response, 'body.members'))
        objects = response.body.members;
    else if (!lodash_1.isEmpty(response.body))
        objects = [response.body];
    if (!opts.raw) {
        const promises = lodash_1.map(objects, (object) => __awaiter(this, void 0, void 0, function* () {
            if (!object['@context'])
                return;
            const objectContext = yield context_1.default(object['@context'], config);
            object['@associations'] = {};
            lodash_1.each(objectContext.associations, (_def, name) => {
                const data = object[name];
                if (data) {
                    object['@associations'][name] = lodash_1.isArray(data) ? lodash_1.map(data, '@id') : lodash_1.get(data, '@id');
                }
                object[name] = null;
            });
        }));
        yield Promise.all(promises);
    }
    if (!opts.raw && !lodash_1.isEmpty(opts.schema)) {
        const schema = schema_1.default(opts.schema);
        objects = yield resolve(objects, schema, config);
    }
    const result = {
        objects,
        get object() { return lodash_1.first(objects); },
        headers: lodash_1.get(response, 'headers', {}),
        type: lodash_1.get(response, `body['@type']`),
    };
    if (lodash_1.get(response, 'body.aggregations')) {
        result.aggregations = lodash_1.reduce(response.body.aggregations, (acc, agg, name) => {
            acc[name] = lodash_1.map(lodash_1.get(agg, 'buckets'), (tranche) => ({ value: tranche.key, count: tranche.doc_count }));
            return acc;
        }, {});
    }
    if (lodash_1.get(response, `body['@total_count']`)) {
        result.pagination = {};
        lodash_1.each(PAGINATION_PROPS, (prop) => {
            if (response.body[prop]) {
                result.pagination[prop.substr(1)] = response.body[prop];
            }
        });
    }
    return result;
});
const performProxiedAction = (appModel, actionName, opts, config) => __awaiter(this, void 0, void 0, function* () {
    const context = yield context_1.default('tuco.request', config);
    const action = context.action('proxy');
    const body = {
        appModel,
        actionName,
        opts: lodash_1.omit(opts, 'proxy'),
        config: config_1.cleanConfig(config),
    };
    const req = request_1.request(config)
        .post(action.template)
        .send(body);
    const response = yield request_1.run(req, config);
    const objects = lodash_1.get(response, 'body.objects', []);
    const result = {
        objects: objects,
        get object() { return lodash_1.first(objects); },
        headers: lodash_1.get(response, 'body.headers', {}),
        type: lodash_1.get(response, 'body.type'),
        aggregations: lodash_1.get(response, 'body.aggregations'),
        pagination: lodash_1.get(response, 'body.pagination'),
    };
    return result;
});
exports.default = (appModel, actionName, opts, config) => __awaiter(this, void 0, void 0, function* () {
    opts = lodash_1.merge({}, DEFAULT_OPTS, { proxy: !lodash_1.isEmpty(opts.schema) }, opts);
    if (opts.proxy && lodash_1.isEmpty(opts.schema)) {
        throw new Error('Proxying is supported only if a schema is given, too.');
    }
    return opts.proxy ?
        performProxiedAction(appModel, actionName, opts, config) :
        performAction(appModel, actionName, opts, config);
});
//# sourceMappingURL=action.js.map