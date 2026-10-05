import { expect } from "chai";
import nock from "nock";
import sinon from "sinon";
import createConfig from "../src/config";
import { request, run, isNode } from "../src/request";
import { setup } from "./setup";

setup();
const origin = "https://um.api.mediastore.dev";

describe("HTTP dependency contracts", () => {
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    it(`preserves the ${method} method, query and JSON payload`, async () => {
      const body = { count: 0, enabled: false, name: "", values: [1, 2] };
      const expectedBody = method === "GET" ? undefined : body;
      const scope = nock(origin)
        .intercept("/contract", method, expectedBody)
        .query({ search: "München & + /", t: "12" })
        .reply(200, { received: true });
      const config = createConfig();
      const response = await run(
        request(config).request({
          method,
          url: `${origin}/contract`,
          params: { search: "München & + /", t: 12 },
          data: expectedBody,
        }),
        config,
        method,
        `${origin}/contract`,
      );
      expect(response.data).to.eql({ received: true });
      expect(config.watcher.pendingRequests).to.eql({});
      scope.done();
    });
  }

  it("merges headers without mutating configuration or per-request headers", async () => {
    const config = createConfig({
      headers: { "Session-Id": "default", "Role-Id": 3 },
    });
    const overrides = {
      "Session-Id": "override",
      "Mpx-Flavours": { locale: "de & en", count: 0, enabled: false },
    };
    const original = JSON.stringify([config.headers, overrides]);
    const scope = nock(origin)
      .get("/headers")
      .matchHeader("session-id", "override")
      .matchHeader("role-id", "3")
      .matchHeader("mpx-flavours", "locale=de%20%26%20en&count=0&enabled=false")
      .reply(200, {});
    await request(config, overrides).get(`${origin}/headers`);
    expect(JSON.stringify([config.headers, overrides])).to.equal(original);
    scope.done();
  });

  it("allows a request to suppress the default session header", async () => {
    const config = createConfig({ headers: { "Session-Id": "private" } });
    const scope = nock(origin, { badheaders: ["session-id"] })
      .get("/anonymous")
      .reply(200);
    await request(config, { "Session-Id": null }).get(`${origin}/anonymous`);
    expect(config.headers["Session-Id"]).to.equal("private");
    scope.done();
  });

  for (const status of [400, 401, 403, 404, 422, 429, 500, 503]) {
    it(`exposes response details and clears pending requests after HTTP ${status}`, async () => {
      const config = createConfig();
      const body = { description: "Backend explanation", errors: ["invalid"] };
      const scope = nock(origin).get("/failure").reply(status, body);
      const url = `${origin}/failure`;
      const result = run(request(config).get(url), config, "GET", url);
      await expect(result).to.be.rejected;
      const error = await result.catch((error) => error);
      expect(error.name).to.equal("RequestError");
      expect(error.text).to.equal(body.description);
      expect(error.object).to.eql(body);
      expect(error.url).to.equal(url);
      expect(error.response.status).to.equal(status);
      expect(config.watcher.pendingRequests).to.eql({});
      scope.done();
    });
  }

  it("preserves a network error when there is no response", async () => {
    const config = createConfig();
    const scope = nock(origin)
      .get("/offline")
      .replyWithError(
        Object.assign(new Error("connection reset"), { code: "ECONNRESET" }),
      );
    const url = `${origin}/offline`;
    const result = run(request(config).get(url), config, "GET", url);
    await expect(result).to.be.rejectedWith("connection reset");
    const error = await result.catch((error) => error);
    expect(error.code).to.equal("ECONNRESET");
    expect(error.text).to.equal("connection reset");
    expect(error.object).to.be.undefined;
    expect(config.watcher.pendingRequests).to.eql({});
    scope.done();
  });

  it("falls back to the error message for a non-JSON error response", async () => {
    const config = createConfig();
    const scope = nock(origin).get("/html").reply(502, "Bad gateway");
    const url = `${origin}/html`;
    const result = run(request(config).get(url), config, "GET", url);
    await expect(result).to.be.rejected;
    const error = await result.catch((error) => error);
    expect(error.object).to.equal("Bad gateway");
    expect(error.text).to.equal(error.message);
    scope.done();
  });

  for (const [status, body] of [
    [204, ""],
    [200, "{malformed"],
    [200, "plain text"],
  ] as [number, string][]) {
    it(`preserves the response for ${status} with ${JSON.stringify(body)}`, async () => {
      const scope = nock(origin)
        .get("/response")
        .reply(status, body, { "Content-Type": "application/json" });
      const response = await request(createConfig()).get(`${origin}/response`);
      expect(response.data).to.equal(body);
      scope.done();
    });
  }

  it("adds window location only when a browser window exists", async () => {
    expect(isNode()).to.equal(true);
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { href: "https://app.example/library" } },
    });
    const scope = nock(origin)
      .get("/window")
      .matchHeader("X-Window-Location", "https://app.example/library")
      .reply(200);
    await request(createConfig()).get(`${origin}/window`);
    expect(isNode()).to.equal(false);
    scope.done();
  });

  it("runs request and response logging interceptors when enabled", async () => {
    const info = sinon.stub(console, "info");
    const scope = nock(origin).get("/verbose").reply(200, {});
    await request(createConfig({ verbose: true })).get(`${origin}/verbose`);
    expect(info.calledWith("Axios Request:")).to.equal(true);
    expect(info.calledWith("Axios Response:")).to.equal(true);
    scope.done();
  });

  it("normalizes non-Axios abort errors and still clears request bookkeeping", async () => {
    const config = createConfig();
    const error = new Error("aborted by caller");
    error.name = "AbortError";
    const result = run(Promise.reject(error), config, "GET", `${origin}/abort`);
    await expect(result).to.be.rejectedWith("Request was aborted");
    expect(error.name).to.equal("AbortError");
    expect(config.watcher.pendingRequests).to.eql({});
  });
});
import "mocha";
