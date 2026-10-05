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
  describe("Basic AbortController functionality", () => {
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
    it("aborts a pending request", async () => {
      const scope = nock(config.endpoints.um)
        .get(matches("/users"))
        .delay(3000)
        .reply(200, { members: [] });
      chipmunk.createAbortController();
      const requestPromise = chipmunk.run(async (ch) => ch.action("um.user", "query"));
      scope.once("request", () => chipmunk.abort());
      try {
        await requestPromise;
        throw new Error("Expected promise to be rejected");
      } catch (err) {
        expect(err.message).to.equal("Request was aborted");
      }
    });

    it("aborts request with per-action signal", async () => {
      const scope = nock(config.endpoints.um)
        .get(matches("/users"))
        .delay(1000)
        .reply(200, { members: [] });
      const controller = new AbortController();
      const requestPromise = chipmunk.run(async (ch) => ch.action("um.user", "query", { signal: controller.signal }));
      scope.once("request", () => controller.abort());
      try {
        await requestPromise;
        throw new Error("Expected promise to be rejected");
      } catch (err) {
        expect(err.message).to.equal("Request was aborted");
      }
    });

    it("continues normal requests when not aborted", async () => {
      nock(config.endpoints.um)
        .get(matches("/users"))
        .reply(200, {
          members: [
            {
              "@context": "https://um.api.mediastore.dev/v20140601/context/user",
              id: "first",
            },
            {
              "@context": "https://um.api.mediastore.dev/v20140601/context/user",
              id: "second",
            },
          ],
        });

      await chipmunk.run(async (ch) => {
        const result = await ch.action("um.user", "query");
        expect(result.objects.length).to.be.gt(1);
      });
    });
  });

  describe("Association resolution abortion", () => {
    it("aborts during association resolution", async () => {
      nock(config.endpoints.um)
        .get(matches("/users"))
        .reply(200, {
          members: [{
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: "1",
            organization: { "@id": "https://um.api.mediastore.dev/v20140601/organization/1" }
          }]
        });
      const scope = nock(config.endpoints.um)
        .get(matches("/organizations/1"))
        .delay(1000)
        .reply(200, { id: "1", name: "Test Org" });
      const controller = chipmunk.createAbortController();
      const requestPromise = chipmunk.run(async (ch) => ch.action("um.user", "get", {
        params: { user_ids: 1 },
        schema: "id, organization { name }", proxy: false
      }));
      scope.once("request", () => controller.abort());
      try {
        await requestPromise;
        throw new Error("Expected promise to be rejected");
      } catch (err) {
        expect(err.message).to.equal("Request was aborted");
      }
    });
  });

  describe("Multiple concurrent requests", () => {
    it("aborts all concurrent requests after both reach the transport", async () => {
      const first = nock(config.endpoints.um).get("/v20140601/users").query({ q: "first" }).delay(1000).reply(200, { members: [] });
      const second = nock(config.endpoints.um).get("/v20140601/users").query({ q: "second" }).delay(1000).reply(200, { members: [] });
      chipmunk.createAbortController();
      let received = 0;
      const abortWhenBothArrive = () => { if (++received === 2) chipmunk.abort(); };
      first.once("request", abortWhenBothArrive);
      second.once("request", abortWhenBothArrive);
      const results = await Promise.all([
        chipmunk.action("um.user", "query", { params: { q: "first" } }),
        chipmunk.action("um.user", "query", { params: { q: "second" } })
      ].map(promise => promise.then(
        () => ({ status: "fulfilled", reason: undefined }),
        reason => ({ status: "rejected", reason })
      )));
      expect(results.map(result => result.reason?.message || result.status)).to.eql(["Request was aborted", "Request was aborted"]);
      expect(received).to.equal(2);
    });
  });

  describe("Error handling", () => {
    it("throws AbortError when request is aborted", async () => {
      const scope = nock(config.endpoints.um)
        .get(matches("/users"))
        .delay(1000)
        .reply(200, { members: [] });
      const controller = chipmunk.createAbortController();
      const requestPromise = chipmunk.run(async (ch) => ch.action("um.user", "query"));
      scope.once("request", () => controller.abort());
      try {
        await requestPromise;
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.equal("Request was aborted");
      }
    });

    it("handles abort in error interceptor", async () => {
      const scope = nock(config.endpoints.um)
        .get(matches("/users"))
        .delay(1000)
        .reply(200, { members: [] });
      const errorInterceptor = sinon.fake.returns(false);
      chipmunk.updateConfig({ errorInterceptor });
      const controller = chipmunk.createAbortController();
      const requestPromise = chipmunk.run(async (ch) => ch.action("um.user", "query"));
      scope.once("request", () => controller.abort());
      try {
        await requestPromise;
        throw new Error("Expected promise to be rejected");
      } catch (err) {
        expect(err.message).to.equal("Request was aborted");
      }
      expect(errorInterceptor.called).to.be.true;
    });
  });

  describe("Configuration updates", () => {
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
});
