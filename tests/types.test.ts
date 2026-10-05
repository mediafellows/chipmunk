import "mocha";
import { expect } from "chai";

import createChipmunk, { IConfig, IActionOpts, IResolveOpts } from "../src";

describe("TypeScript Types", () => {
  it("should have proper types for AbortController in config", () => {
    const config: IConfig = {
      abortController: new AbortController(),
      signal: new AbortController().signal
    };

    expect(config.abortController).to.be.instanceOf(AbortController);
    expect(config.signal).to.be.instanceOf(AbortSignal);
  });

  it("should have proper types for signal in action options", () => {
    const opts: IActionOpts = {
      signal: new AbortController().signal,
      headers: { "Content-Type": "application/json" },
      body: { name: "test" },
      params: { id: 1 }
    };

    expect(opts.signal).to.be.instanceOf(AbortSignal);
    expect(opts.headers).to.have.property("Content-Type");
    expect(opts.body).to.have.property("name");
    expect(opts.params).to.have.property("id");
  });

  it("should have proper types for association resolve options", () => {
    const resolveOpts: IResolveOpts = {
      preview_image: {
        params: { include_folders: true },
        body: { search: { filters: [["type", "eq", "folder"]] } }
      },
      default_layer: {
        params: { include_archived: true }
      }
    };

    const opts: IActionOpts = {
      schema: "id, preview_image { name }, default_layer { name }",
      resolveOpts
    };

    expect(opts.resolveOpts.preview_image.params).to.have.property("include_folders");
    expect(opts.resolveOpts.preview_image.body).to.have.nested.property("search.filters");
    expect(opts.resolveOpts.default_layer.params).to.have.property("include_archived");
  });

  it("should allow creating chipmunk with abort controller in config", () => {
    const controller = new AbortController();
    const chipmunk = createChipmunk({
      abortController: controller,
      signal: controller.signal
    });

    console.log(chipmunk.getAbortSignal())

    expect(chipmunk.getAbortSignal()).to.equal(controller.signal);
  });

  it("should allow updating config with abort controller", () => {
    const chipmunk = createChipmunk();
    const controller = new AbortController();

    chipmunk.updateConfig({
      abortController: controller,
      signal: controller.signal
    });

    expect(chipmunk.getAbortSignal()).to.equal(controller.signal);
  });
});