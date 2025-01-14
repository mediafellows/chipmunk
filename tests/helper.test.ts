import "mocha";
import nock from "nock";

import createChipmunk from "../src";
import { setup, readCredentials } from "./setup";

const inactive = (...args) => {
  console.log("inactive", args);
};

inactive("helper runs", () => {
  const config = setup();
  const credentials = readCredentials();
  let chipmunk;

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
    await chipmunk.context("um.organization");
  });

  it("prints geo_scope context", async () => {
    await chipmunk.context("um.geo_scope");
  });

  it("fetches users", async () => {
    await chipmunk.action("um.user", "query", {
      params: { per: 3 },
    });
  });
});
