import "mocha";
import { expect } from "chai";
import nock from "nock";

import createChipmunk from "../src";
import { setup, matches, readCredentials } from "./setup";

const config = setup();
const credentials = readCredentials();
let chipmunk;

const inactive = (...args) => {};

inactive("helper runs", () => {
  //describe.only('helper runs', () => {
  beforeEach(async () => {
    nock.restore();

    chipmunk = createChipmunk(config);

    const { email, password } = credentials;

    const result = await chipmunk.action("um.session", "create", {
      body: {
        email,
        password,
      },
    });

    chipmunk.updateConfig({ headers: { "Session-Id": result.object.id } });
  });

  it("prints organization context", async () => {
    const context = await chipmunk.context("um.organization");
    //console.log(context)
  });

  it("prints geo_scope context", async () => {
    const context = await chipmunk.context("um.geo_scope");
    //console.log(context)
  });

  it("fetches users", async () => {
    const result = await chipmunk.action("um.user", "query", {
      params: { per: 3 },
    });
    //console.log(result.objects)
  });
});

const sampleUser = {
  "@id": "https://um.api.mediapeers.mobi/v20140601/user/1659",
  "@context": "https://um.api.mediapeers.mobi/v20140601/context/user",
  "@type": "user",
  id: 1659,
  access_level: "viewable",
  organization_id: 104,
  role_id: null,
  responsible_user_id: 9999729,
  created_at: "2013-11-25T12:00:24.082Z",
  updated_at: "2018-05-31T11:21:52.748Z",
  geo_scopes: [
    { "@id": "https://um.api.mediapeers.mobi/v20140601/geo_scope/UGA" },
    { "@id": "https://um.api.mediapeers.mobi/v20140601/geo_scope/SWZ" },
    { "@id": "https://um.api.mediapeers.mobi/v20140601/geo_scope/UZB" },
    { "@id": "https://um.api.mediapeers.mobi/v20140601/geo_scope/XEU" },
  ],
  groups: {
    "@id": "https://um.api.mediapeers.mobi/v20140601/users/1659/groups",
  },
  organization: {
    "@id": "https://um.api.mediapeers.mobi/v20140601/organization/104",
  },
  responsible_user: {
    "@id": "https://um.api.mediapeers.mobi/v20140601/user/9999729",
  },
  password: {
    "@id": "https://um.api.mediapeers.mobi/v20140601/users/1659/password",
  },
  phones: {
    "@id": "https://um.api.mediapeers.mobi/v20140601/users/1659/phones",
  },
  im_contacts: {
    "@id": "https://um.api.mediapeers.mobi/v20140601/users/1659/im_contacts",
  },
  social_media_profiles: {
    "@id":
      "https://um.api.mediapeers.mobi/v20140601/users/1659/social_media_profiles",
  },
  address: {
    "@id": "https://um.api.mediapeers.mobi/v20140601/users/1659/address",
  },
  country: { "@id": "https://um.api.mediapeers.mobi/v20140601/geography/DEU" },
};
