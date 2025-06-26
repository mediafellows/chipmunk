import "mocha";
import { expect } from "chai";
import sinon from "sinon";

import { setup, nap } from "./setup";
import createChipmunk from "../src";

const config = setup();
let chipmunk;

describe("chipmunk.run", () => {
  beforeEach(() => {
    chipmunk = createChipmunk(config);
  });

  describe("with error interceptor", () => {
    it("ignores the error if the interceptor returns true", async () => {
      chipmunk.updateConfig({ errorInterceptor: () => true });

      const block = chipmunk.run(async (ch) => {
        await ch.spec("um.foo");
      });

      await expect(block).to.eventually.be.fulfilled;
    });

    it("throws an error if the interceptor does not return true", async () => {
      chipmunk.updateConfig({ errorInterceptor: () => null });

      const block = chipmunk.run(async (ch) => {
        await ch.spec("um.foo");
      });

      await expect(block).to.be.rejectedWith("Not Found");
    });

    // NOTE: this is an example how differentiate request specific errors from other errors..
    it("throws an error if the original error was not because of an unsuccessful request", async () => {
      chipmunk.updateConfig({
        errorInterceptor: (err) => err.name === "RequestError",
      });

      const block = chipmunk.run(async (ch) => {
        throw new Error("random error");
        await ch.spec("um.foo");
      });

      await expect(block).to.be.rejectedWith("random");
    });

    it("passes an un-intercepted error to the optional error handler", async () => {
      const handler = sinon.fake();

      await chipmunk.run(async (ch) => {
        throw new Error("random error");
        await ch.spec("um.foo");
      }, handler);

      expect(handler.called).to.be.true;
    });

    it("returns the result of the run block", async () => {
      const returnValue = await chipmunk.run(async () => {
        return "yay";
      });

      expect(returnValue).to.equal("yay");
    });
  });

  describe("#performLater", () => {
    it("calls perform later handlers after requests have been made", async () => {
      const handler1 = sinon.fake();
      const handler2 = sinon.fake();

      chipmunk.performLater(handler1);
      chipmunk.performLater(handler2);

      await chipmunk.spec("um.user");
      await chipmunk.spec("um.organization");

      await nap(200);

      expect(handler1.called).to.be.true;
      expect(handler2.called).to.be.true;
    });
  });

  describe("#AbortController", () => {
    it("creates an AbortController and sets it in config", () => {
      const controller = chipmunk.createAbortController();

      expect(controller).to.be.instanceOf(AbortController);
      expect(chipmunk.currentConfig().signal).to.equal(controller.signal);
    });

    it("aborts the current controller", () => {
      const controller = chipmunk.createAbortController();
      const abortSpy = sinon.spy(controller, 'abort');

      chipmunk.abort();

      expect(abortSpy.called).to.be.true;
      expect(controller.signal.aborted).to.be.true;
    });

    it("returns the current abort signal", () => {
      expect(chipmunk.getAbortSignal()).to.be.undefined;

      const controller = chipmunk.createAbortController();

      expect(chipmunk.getAbortSignal()).to.equal(controller.signal);
    });

    it("handles multiple abort controller creations", () => {
      const controller1 = chipmunk.createAbortController();
      const controller2 = chipmunk.createAbortController();

      expect(controller1).to.not.equal(controller2);
      expect(chipmunk.getAbortSignal()).to.equal(controller2.signal);
    });
  });
});
