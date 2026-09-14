import { expect } from "chai";
import nock from "nock";
import createChipmunk from "../src";
import createConfig, { cleanConfig } from "../src/config";
import format from "../src/format";
import parseSchema from "../src/schema";
import { setup } from "./setup";

const config = setup();
const origin = "https://um.api.mediastore.dev";

describe("data and serialization dependency contracts", () => {
  it("deeply merges configuration while keeping inputs and separate clients isolated", () => {
    const input = {
      headers: { "Mpx-Flavours": { nested: { first: 1 }, items: [1, 2] } },
    };
    const first = createConfig(input, {
      headers: { "Mpx-Flavours": { nested: { second: 2 } } },
    });
    const second = createConfig(input);
    expect(first.headers["Mpx-Flavours"].nested).to.eql({
      first: 1,
      second: 2,
    });
    first.headers["Mpx-Flavours"].items.push(3);
    expect(input.headers["Mpx-Flavours"].items).to.eql([1, 2]);
    expect(second.headers["Mpx-Flavours"].items).to.eql([1, 2]);
    expect(first.watcher.pendingRequests).not.to.equal(
      second.watcher.pendingRequests,
    );
  });

  it("omits local-only configuration without mutating the source", () => {
    const source = createConfig({
      signal: new AbortController().signal,
      verbose: true,
    });
    const cleaned = cleanConfig(source);
    for (const key of [
      "signal",
      "abortController",
      "watcher",
      "cache",
      "verbose",
      "errorInterceptor",
    ]) {
      expect(cleaned).not.to.have.property(key);
    }
    expect(source.signal).to.be.instanceOf(AbortSignal);
    expect(source.verbose).to.equal(true);
  });

  it("preserves false, zero, null, empty strings and primitive arrays while cleaning nested payloads", () => {
    const input = {
      count: 0,
      enabled: false,
      name: "",
      absent: null,
      tags: [0, false, ""],
      children: [{ "@id": "ref" }, { id: 0, label: "" }],
      empty: {},
      errors: ["old"],
    };
    const before = JSON.stringify(input);
    expect(format(input, false, false)).to.eql({
      count: 0,
      enabled: false,
      name: "",
      absent: null,
      tags: [0, false, ""],
      children: [{ id: 0, label: "" }],
    });
    expect(JSON.stringify(input)).to.equal(before);
  });

  it("formats Rails nested attributes and CSV associations without changing the original body", () => {
    const input = {
      id: 0,
      child: { name: "child" },
      children: [{ name: "first" }],
      group_ids: "1,,2,",
    };
    const before = JSON.stringify(input);
    expect(format(input, false, true)).to.eql({
      id: 0,
      child_attributes: { name: "child" },
      children_attributes: [{ name: "first" }],
      group_ids: ["1", "2"],
    });
    expect(JSON.stringify(input)).to.equal(before);
  });

  for (const value of ["München", "a/b?c&d=+", "", 0, false]) {
    it(`encodes URI template query values: ${JSON.stringify(value)}`, async () => {
      const client = createChipmunk(config);
      const scope = nock(origin)
        .get("/v20140601/users")
        .query({ q: String(value) })
        .reply(200, { members: [] });
      await client.action("um.user", "query", { params: { q: value } });
      scope.done();
    });
  }

  it("rejects unbalanced schema braces", () => {
    expect(() => parseSchema("id, owner { name")).to.throw("bad structure");
  });

  it("keeps nested schemas and input schema objects intact", () => {
    expect(parseSchema("id,\n owner { name, roles { id } },")).to.eql({
      id: true,
      owner: { name: true, roles: { id: true } },
    });
    const schema = { id: true };
    expect(parseSchema(schema)).to.equal(schema);
  });
});
import "mocha";
