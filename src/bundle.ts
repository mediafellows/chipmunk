"use strict";

import UriTemplate from "uri-templates";

import createChipmunk, { cleanConfig } from "./index";

window["UriTemplate"] = UriTemplate;

if (!window["MFX"]) window["MFX"] = {};
window["MFX"]["createChipmunk"] = createChipmunk;
window["MFX"]["cleanChipmunkConfig"] = cleanConfig;
