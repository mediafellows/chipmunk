import get from "lodash/get";
import merge from "lodash/merge";
import range from "lodash/range";
import map from "lodash/map";

import action, { IActionOpts, IResult } from "./action";
import { IConfig } from "./config";

export default async <T> (
  appModel: string,
  actionName: string,
  opts: IActionOpts,
  config: IConfig
): Promise<IResult<T>> => {
  const per = get(opts, "params.per") || get(opts, "body.per") || 100;

  const result= await action<T>(appModel, actionName, opts, config);
  let objects = result.objects.slice();

  if (result.pagination) {
    const startPage = get(opts, "params.page", 1);

    if (startPage < result.pagination.total_pages) {
      const pages = range(startPage + 1, result.pagination.total_pages + 1);
      const promises = map(pages, (page) => {
        const pageOpts = merge({}, opts, {
          params: { page, per },
          body: { page, per },
        });

        return action<T>(appModel, actionName, pageOpts, config);
      });

      const results = await Promise.all(promises);

      for (let nextResult of results) {
        objects.push(...nextResult.objects);
      }
    }
    result.pagination.total_pages = 1;
    result.objects = objects;
  }

  return result;
};
