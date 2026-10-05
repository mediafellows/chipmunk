const { describe, it: nodeIt, beforeEach, afterEach } = require("node:test");
const it = (name, fn) => nodeIt(name, { timeout: 5000 }, fn);
const assert = require("node:assert/strict");
const { startFixture } = require("./server.cjs");
const createChipmunk = require("../../dist/src").default;
const { request, run } = require("../../dist/src/request");
const createConfig = require("../../dist/src/config").default;

describe("built package over real HTTP", { timeout: 60000 }, () => {
  let fixture, client;
  beforeEach(async () => {
    fixture = await startFixture();
    client = createChipmunk({
      endpoints: { um: fixture.origin, tuco: fixture.origin },
      timestamp: null,
      headers: { "Session-Id": "test-session" },
    });
  });
  afterEach(async () => {
    await fixture.close();
  });

  for (const [action, method] of [
    ["create", "POST"],
    ["update", "PUT"],
    ["patch", "PATCH"],
    ["delete", "DELETE"],
  ]) {
    it(`sends ${method} bodies and custom headers through the published API`, async () => {
      const body = { count: 0, enabled: false, name: "", values: [1, 2] };
      const result = await client.action("um.widget", action, { body });
      assert.equal(result.object.method, method);
      assert.deepEqual(result.object.body, body);
      assert.equal(result.object.headers["session-id"], "test-session");
      assert.deepEqual(client.currentConfig().watcher.pendingRequests, {});
    });
  }

  it("sends native multipart FormData with a boundary and intact file bytes", async () => {
    const body = new FormData();
    body.append("caption", "München & friends");
    body.append(
      "file",
      new Blob(["file-content"], { type: "text/plain" }),
      "résumé.txt",
    );
    await client.action("um.widget", "create", { body });
    const sent = fixture.requests.find((record) => record.pathname === "/echo");
    const boundary = sent.headers["content-type"].match(/boundary=(.+)$/)[1];
    assert.ok(boundary);
    assert.ok(sent.body.includes(`--${boundary}`));
    assert.ok(sent.body.includes('name="caption"'));
    assert.ok(sent.body.includes("München & friends"));
    assert.ok(sent.body.includes("file-content"));
    assert.ok(sent.body.includes('filename="résumé.txt"'));
  });

  it("keeps authentication on a same-origin redirect", async () => {
    const result = await client.action("um.widget", "redirect", {
      params: { target: "/echo" },
    });
    assert.equal(result.object.headers["session-id"], "test-session");
  });

  for (const status of [401, 422, 503]) {
    it(`normalizes HTTP ${status} errors through the public API`, async () => {
      await assert.rejects(
        client.action("um.widget", "status", { params: { status } }),
        (error) => {
          assert.equal(error.name, "RequestError");
          assert.equal(error.text, "fixture error");
          assert.equal(error.object.status, status);
          assert.equal(error.url, `${fixture.origin}/status/${status}`);
          return true;
        },
      );
      assert.deepEqual(client.currentConfig().watcher.pendingRequests, {});
    });
  }

  it("returns an empty collection for HTTP 204", async () => {
    const result = await client.action("um.widget", "status", {
      params: { status: 204 },
    });
    assert.deepEqual(result.objects, []);
    assert.equal(result.object, undefined);
  });

  it("propagates a socket failure and clears bookkeeping", async () => {
    const config = createConfig();
    const url = `${fixture.origin}/disconnect`;
    await assert.rejects(
      run(request(config).get(url), config, "GET", url),
      (error) => {
        assert.equal(error.name, "RequestError");
        assert.equal(error.code, "ECONNRESET");
        assert.equal(error.object, undefined);
        return true;
      },
    );
    assert.deepEqual(config.watcher.pendingRequests, {});
  });

  it("aborts after the server receives the request", async () => {
    client.createAbortController();
    const received = fixture.nextRequest("/widgets");
    const rejected = assert.rejects(
      client.action("um.widget", "query", { params: { q: "hold" } }),
      { message: "Request was aborted", code: "ERR_CANCELED" },
    );
    await received;
    assert.equal(
      Object.keys(client.currentConfig().watcher.pendingRequests).length,
      1,
    );
    client.abort();
    await rejected;
    assert.deepEqual(client.currentConfig().watcher.pendingRequests, {});
  });

  it("aborts a proxied request after transmission without serializing the signal", async () => {
    const controller = new AbortController();
    const received = fixture.nextRequest("/proxy");
    const rejected = assert.rejects(
      client.action("um.widget", "query", {
        proxy: true,
        schema: "id",
        params: { q: "hold" },
        signal: controller.signal,
      }),
      { message: "Request was aborted" },
    );
    const sent = await received;
    controller.abort();
    await rejected;
    assert.equal("signal" in sent.body.opts, false);
    assert.deepEqual(client.currentConfig().watcher.pendingRequests, {});
  });

  it("propagates per-action cancellation into an active association request", async () => {
    const controller = new AbortController();
    const received = fixture.nextRequest("/teams/1");
    const rejected = assert.rejects(
      client.action("um.widget", "get", {
        params: { id: 1 },
        schema: "id, team { id, name }",
        proxy: false,
        signal: controller.signal,
      }),
      { message: "Request was aborted" },
    );
    await received;
    controller.abort();
    await rejected;
    assert.deepEqual(client.currentConfig().watcher.pendingRequests, {});
  });

  it("honors a global abort even when the action also has its own signal", async () => {
    client.createAbortController();
    const controller = new AbortController();
    const received = fixture.nextRequest("/widgets");
    const rejected = assert.rejects(
      client.action("um.widget", "query", {
        params: { q: "hold" },
        signal: controller.signal,
      }),
      { message: "Request was aborted" },
    );
    await received;
    client.abort();
    await rejected;
    assert.equal(controller.signal.aborted, false);
  });

  it("rejects a pre-aborted proxy action before any network traffic", async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      client.action("um.widget", "query", {
        proxy: true,
        schema: "id",
        signal: controller.signal,
      }),
      { message: "Request was aborted" },
    );
    assert.deepEqual(fixture.requests, []);
  });

  it("blocks cross-origin redirects before exposing custom session headers", async () => {
    const target = await startFixture();
    try {
      await assert.rejects(
        client.action("um.widget", "redirect", {
          params: { target: `${target.origin}/echo` },
        }),
        /unsupported redirect origin/,
      );
      assert.equal(target.requests.length, 0);
    } finally {
      await target.close();
    }
  });

  it("keeps another caller alive when cancellation happens during shared metadata loading", async () => {
    const first = new AbortController();
    const second = new AbortController();
    const received = fixture.nextRequest("/v20140601/context/widget");
    const rejected = assert.rejects(
      client.action("um.widget", "query", { signal: first.signal, raw: true }),
      { message: "Request was aborted" },
    );
    await received;
    assert.equal(
      Object.keys(client.currentConfig().watcher.pendingRequests).length,
      1,
    );
    const surviving = client.action("um.widget", "query", {
      signal: second.signal,
      raw: true,
    });
    first.abort();
    await Promise.all([rejected, assert.doesNotReject(surviving)]);
    assert.equal((await surviving).object.id, 1);
    assert.deepEqual(client.currentConfig().watcher.pendingRequests, {});
  });
});
