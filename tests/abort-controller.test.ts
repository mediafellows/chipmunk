import "mocha";
import { expect } from "chai";
import nock from "nock";
import createChipmunk from "../src";
import { setup, matches } from "./setup";
import sinon from "sinon";

const config = setup();
let chipmunk;

beforeEach(() => {
  chipmunk = createChipmunk(config);
});

describe("AbortController", () => {
  describe.skip("Basic AbortController functionality", () => {
    it("creates an AbortController instance", () => {
      const controller = chipmunk.createAbortController();

      expect(controller).to.be.instanceOf(AbortController);
      expect(controller.signal).to.be.instanceOf(AbortSignal);
    });

    it("sets the signal in config when creating controller", () => {
      const controller = chipmunk.createAbortController();

      expect(chipmunk.currentConfig().signal).to.equal(controller.signal);
      expect(chipmunk.getAbortSignal()).to.equal(controller.signal);
    });

    it("aborts the controller and marks signal as aborted", () => {
      const controller = chipmunk.createAbortController();

      expect(controller.signal.aborted).to.be.false;

      chipmunk.abort();

      expect(controller.signal.aborted).to.be.true;
    });

    it("handles abort when no controller exists", () => {
      expect(() => chipmunk.abort()).to.not.throw();
    });

    it("returns undefined signal when no controller exists", () => {
      expect(chipmunk.getAbortSignal()).to.be.undefined;
    });
  });

  describe("Request abortion", () => {
    it.skip("aborts a pending request", async () => {
      // Mock a slow request
      nock(config.endpoints.um)
        .get(matches("/users"))
        .delay(3000) // 1 second delay
        .reply(200, { members: [] });

      const controller = chipmunk.createAbortController();

      controller.signal.addEventListener('abort', () => {
        console.log('Abort signal triggered!');
      });

      // Start the request
      const requestPromise = chipmunk.run(async (ch) => {
        return await ch.action("um.user", "query", {proxy: false});
      });

      // Abort immediately
      chipmunk.abort();

      // Should reject with AbortError
      await expect(requestPromise).to.be.rejectedWith("Request was aborted");
    });

    it.skip("aborts request with per-action signal", async () => {
      // Mock a slow request
      nock(config.endpoints.um)
        .get(matches("/users"))
        .delay(1000)
        .reply(200, { members: [] });

      const controller = new AbortController();

      // Start the request with specific signal
      const requestPromise = chipmunk.run(async (ch) => {
        return await ch.action("um.user", "query", { signal: controller.signal });
      });

      // Abort immediately
      controller.abort();

      // Should reject with AbortError
      await expect(requestPromise).to.be.rejectedWith("Request was aborted");
    });

    it.skip("continues normal requests when not aborted", async () => {
      nock(config.endpoints.um)
        .get(matches("/users"))
        .reply(200, { members: [{ id: "1" }] });

      chipmunk.createAbortController();

      const result = await chipmunk.run(async (ch) => {
        return await ch.action("um.user", "query");
      });

      expect(result.objects).to.have.length(1);
      expect(result.objects[0].id).to.equal("1");
    });
  });

  describe.skip("Association resolution abortion", () => {
    it("aborts during association resolution", async () => {
      // Mock main request
      nock(config.endpoints.um)
        .get(matches("/users"))
        .reply(200, {
          members: [{
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: "1",
            organization: { "@id": "http://um.app/organization/1" }
          }]
        });

      // Mock organization request with delay
      nock(config.endpoints.um)
        .get(matches("/organizations/1"))
        .delay(1000)
        .reply(200, { id: "1", name: "Test Org" });

      const controller = chipmunk.createAbortController();

      const requestPromise = chipmunk.run(async (ch) => {
        return await ch.action("um.user", "get", {
          params: { user_ids: 1 },
          schema: "id, organization { name }"
        });
      });

      // Abort during association resolution
      setTimeout(() => controller.abort(), 100);

      await expect(requestPromise).to.be.rejectedWith("Request was aborted");
    });
  });

  describe.skip("Multiple concurrent requests", () => {
    it("aborts all concurrent requests", async () => {
      // Mock multiple slow requests
      nock(config.endpoints.um)
        .get(matches("/users"))
        .delay(1000)
        .reply(200, { members: [] });

      nock(config.endpoints.um)
        .get(matches("/organizations"))
        .delay(1000)
        .reply(200, { members: [] });

      chipmunk.createAbortController();

      const request1 = chipmunk.run(async (ch) => {
        return await ch.action("um.user", "query");
      });

      const request2 = chipmunk.run(async (ch) => {
        return await ch.action("um.organization", "query");
      });

      // Abort both requests
      chipmunk.abort();

      await expect(request1).to.be.rejectedWith("Request was aborted");
      await expect(request2).to.be.rejectedWith("Request was aborted");
    });
  });

  describe.skip("Error handling", () => {
    it("throws AbortError when request is aborted", async () => {
      nock(config.endpoints.um)
        .get(matches("/users"))
        .delay(1000)
        .reply(200, { members: [] });

      const controller = chipmunk.createAbortController();

      const requestPromise = chipmunk.run(async (ch) => {
        return await ch.action("um.user", "query");
      });

      controller.abort();

      try {
        await requestPromise;
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.name).to.equal("AbortError");
        expect(error.message).to.equal("Request was aborted");
      }
    });

    it("handles abort in error interceptor", async () => {
      nock(config.endpoints.um)
        .get(matches("/users"))
        .delay(1000)
        .reply(200, { members: [] });

      const errorInterceptor = sinon.fake.returns(false);
      chipmunk.updateConfig({ errorInterceptor });

      const controller = chipmunk.createAbortController();

      const requestPromise = chipmunk.run(async (ch) => {
        return await ch.action("um.user", "query");
      });

      controller.abort();

      await expect(requestPromise).to.be.rejectedWith("Request was aborted");
      expect(errorInterceptor.called).to.be.true;
    });
  });

  describe.skip("Configuration updates", () => {
    it("preserves abort controller when updating other config", () => {
      const controller = chipmunk.createAbortController();

      chipmunk.updateConfig({ verbose: true });

      expect(chipmunk.getAbortSignal()).to.equal(controller.signal);
      expect(chipmunk.currentConfig().verbose).to.be.true;
    });

    it("allows setting abort controller via config", () => {
      const controller = new AbortController();

      chipmunk.updateConfig({ abortController: controller });

      expect(chipmunk.getAbortSignal()).to.equal(controller.signal);
    });
  });

  describe.skip("Clean config", () => {
    it("excludes abort controller from cleaned config", () => {
      chipmunk.createAbortController();
      const cleanedConfig = chipmunk.currentConfig();

      expect(cleanedConfig.abortController).to.be.undefined;
      expect(cleanedConfig.signal).to.be.undefined;
    });
  });
});
