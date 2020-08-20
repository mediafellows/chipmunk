import { get, merge } from 'lodash'

import action, {IActionOpts, IResult} from './action'
import {IConfig} from './config'

export default async (appModel: string, actionName: string, opts: IActionOpts, config: IConfig): Promise<IResult> => {
  const result = await action(appModel, actionName, opts, config)

  if (result.pagination) {
    let currentPage = get(opts, 'params.page', 1)

    while (currentPage < result.pagination.total_pages) {
      currentPage += 1

      const nextResults = await action(
        appModel,
        actionName,
        merge({}, opts, { params: { page: currentPage } }),
        config,
      )

      result.objects.push(...nextResults.objects)
    }

    result.pagination.total_pages = 1
  }

  return result
}
