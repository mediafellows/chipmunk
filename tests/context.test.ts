import "mocha";
import { expect } from "chai";
import nock from "nock";

import createChipmunk from "../src";
import { setup, matches } from "./setup";
import userContext from "./fixtures/user.context";

const config = setup();
let chipmunk;

describe("context", () => {
  beforeEach(() => {
    chipmunk = createChipmunk(config);
  });

  it("returns a valid context", async () => {
    await chipmunk.run(async (ch) => {
      const userContext = await ch.context("um.user");
      expect(userContext.properties).not.to.be.empty;
    });
  });

  it("exposes associations", async () => {
    await chipmunk.run(async (ch) => {
      const userContext = await ch.context("um.user");
      expect(userContext.associations.firt_name).to.be.undefined;
      expect(userContext.associations.organization).not.to.be.empty;
    });
  });

  it("fails to find a random context", async () => {
    await chipmunk.run(async (ch) => {
      const promise = ch.context("um.foo");
      await expect(promise).to.be.rejectedWith("Not Found");
    });
  });

  it("makes the request to get a context for a sub-model", async () => {
    nock(config.endpoints.pm)
      .get(matches("/context/product/asset"))
      .reply(200, { "@context": {} });

    await chipmunk.context("pm.product/asset");
  });

  it("makes the request to get a context only once, i.e. caches the result", async () => {
    chipmunk.updateConfig({ cache: { enabled: true, default: "runtime" } });
    chipmunk.cache.clear();

    nock(config.endpoints.um)
      .get(matches("/context/dontgetmewrong"))
      .once() // IMPORTANT!
      .reply(200, userContext);

    await chipmunk.context("um.dontgetmewrong");
    await chipmunk.context("um.dontgetmewrong");
  });

  it("runs only one of multiple parallel identical requests", async () => {
    chipmunk.updateConfig({ cache: { enabled: true, default: "runtime" } });
    chipmunk.cache.clear();

    nock(config.endpoints.um)
      .get(matches("/context/dontgetmewrong"))
      .once() // IMPORTANT!
      .reply(200, userContext);

    const promises = [
      chipmunk.context("um.dontgetmewrong"),
      chipmunk.context("um.dontgetmewrong"),
    ];

    await Promise.all(promises);
  });
});
