'use strict'

import UriTemplate from 'uri-templates'
import request from 'superagent'

import createChipmunk, {cleanConfig} from './index'

window['UriTemplate']   = UriTemplate
window['request']       = request

if (!window['MFX']) window['MFX'] = {};
window['MFX']['createChipmunk'] = createChipmunk;
window['MFX']['cleanChipmunkConfig'] = cleanConfig;
