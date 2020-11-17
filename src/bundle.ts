'use strict'

import UriTemplate from 'uri-templates'
import request from 'superagent'

import createChipmunk, {cleanConfig} from './index'

const chipmunkUtils = {
  createChipmunk,
  cleanConfig,
}

window['UriTemplate']   = UriTemplate
window['request']       = request
window['chipmunkUtils'] = chipmunkUtils
