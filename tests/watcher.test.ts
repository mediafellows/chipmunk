import { expect } from "chai";
import sinon from "sinon";
import createConfig from "../src/config";
import {
  enqueuePerformLater,
  enqueueRequest,
  clearRequest,
  pending,
} from "../src/watcher";
import { setup } from "./setup";

setup();
describe("request watcher", () => {
  it("defers callbacks while a request is pending, then runs each once", () => {
    const clock = sinon.useFakeTimers();
    const config = createConfig();
    const handlers = [sinon.spy(), sinon.spy()];
    enqueueRequest("request", Promise.resolve(), config, "GET", "/resource");
    handlers.forEach((handler) => enqueuePerformLater(handler, config));
    clock.tick(200);
    expect(handlers.every((handler) => handler.notCalled)).to.equal(true);
    clearRequest("request", config);
    clearRequest("already removed", config);
    clock.tick(200);
    expect(handlers.every((handler) => handler.calledOnce)).to.equal(true);
    expect(config.watcher.pendingRequests).to.eql({});
    expect(config.watcher.performLaterHandlers).to.eql([]);
  });

  it("only shares pending GET requests for the exact URL", () => {
    const config = createConfig();
    const payload = Promise.resolve({ id: 1 });
    enqueueRequest("post", payload, config, "POST", "/resource");
    expect(pending("/resource", config)).to.be.undefined;
    enqueueRequest("get", payload, config, "GET", "/resource?role=1");
    expect(pending("/resource", config)).to.be.undefined;
    expect(pending("/resource?role=1", config)).to.equal(payload);
  });

  it("does not share a pending request with an independently cancellable caller", () => {
    const config = createConfig({ signal: new AbortController().signal });
    const payload = Promise.resolve({ id: 1 });
    enqueueRequest("get", payload, config, "GET", "/resource");
    expect(pending("/resource", config)).to.equal(payload);
    expect(
      pending("/resource", { ...config, signal: new AbortController().signal }),
    ).to.be.undefined;
    expect(pending("/resource", { ...config, signal: undefined })).to.be
      .undefined;
  });
});
import "mocha";
