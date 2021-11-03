import "mocha";
import { expect } from "chai";
import { keys } from "lodash";
import sinon from "sinon";

import { _runtimeCache as internalCache } from "../src/cache";

import { setup } from "./setup";
import createChipmunk from "../src";

const config = setup();
let chipmunk;

let storage = {};
const storageMock = {
  setItem: (key, value) => (storage[key] = value),
  getItem: (key) => storage[key],
  removeItem: (key) => delete storage[key],
  get length() {
    return keys(storage).length;
  },
  key: (index) => keys(storage)[index],
  clear: () => (storage = {}),
};

describe("runtime cache", () => {
  beforeEach(() => {
    chipmunk = createChipmunk(config, { cache: { default: "runtime" } });
  });
  afterEach(() => {
    chipmunk.cache.clear();
  });

  describe("basic functionality", () => {
    it("saves into cache", () => {
      sinon.stub(Date, "now").returns(0);
      const expected = { foo: { expires: 60 * 60000, value: "bar" } };

      chipmunk.cache.set("foo", "bar", { noPrefix: true });
      expect(internalCache).to.eql(expected);
    });

    it("writes & reads from cache", () => {
      chipmunk.cache.set("foo", "bar");
      expect(chipmunk.cache.get("foo")).to.equal("bar");
    });

    it("returns null if value has expired", () => {
      sinon.stub(Date, "now").returns(60 * 60000 + 1);
      internalCache["foo"] = { expires: 60 * 60000, value: "bar" };

      expect(chipmunk.cache.get("foo", { noPrefix: true })).to.be.null;
    });

    it("drops single value from cache", () => {
      sinon.stub(Date, "now").returns(0);

      internalCache["foo"] = { expires: 60 * 60000, value: "bar" };
      internalCache["baz"] = { expires: 60 * 60000, value: "bam" };

      const expected = {
        foo: { expires: 60 * 60000, value: "bar" },
      };

      chipmunk.cache.remove("baz", { noPrefix: true });
      expect(internalCache).to.eql(expected);
    });

    it("drops multiple values from cache by prefix", () => {
      sinon.stub(Date, "now").returns(0);

      internalCache["mallorca-foo"] = { expires: 60 * 60000, value: "bar" };
      internalCache["menorca-foo"] = { expires: 60 * 60000, value: "bar" };
      internalCache["mallorca-baz"] = { expires: 60 * 60000, value: "bam" };

      const expected = {
        "menorca-foo": { expires: 60 * 60000, value: "bar" },
      };

      chipmunk.cache.remove("mallorca*", { noPrefix: true });
      expect(internalCache).to.eql(expected);
    });
  });

  describe("convenience functionality", () => {
    it("updates existing value", () => {
      chipmunk.cache.set("foo", 2);
      chipmunk.cache.update("foo", (value) => value + 1);

      expect(chipmunk.cache.get("foo")).to.equal(3);
    });

    it("updates or creates a value", () => {
      chipmunk.cache.update("foo", (value) => value + 1, { defaultValue: 5 });

      expect(chipmunk.cache.get("foo")).to.equal(6);
    });

    it(`saves into cache, taking into account the current's config cache relevant headers`, () => {
      chipmunk.updateConfig({
        headers: { "Affiliation-Id": null, "Role-Id": 5 },
      });
      sinon.stub(Date, "now").returns(0);

      const expected = { "5-foo": { expires: 60 * 60000, value: "bar" } };

      chipmunk.cache.set("foo", "bar");
      expect(internalCache).to.eql(expected);
    });
  });
});

describe("storage cache", () => {
  beforeEach(() => {
    global["window"] = {
      localStorage: storageMock,
    };
    chipmunk = createChipmunk(config, { cache: { default: "storage" } });
  });
  afterEach(() => {
    chipmunk.cache.clear();
  });

  describe("basic functionality", () => {
    it("writes & reads from cache", () => {
      chipmunk.cache.set("foo", "bar");
      expect(chipmunk.cache.get("foo")).to.equal("bar");
    });

    it("returns null if value has expired", () => {
      const stub = sinon.stub(Date, "now").returns(0);
      chipmunk.cache.set("foo", "bar");

      stub.restore();
      sinon.stub(Date, "now").returns(60 * 60000 + 1);
      expect(chipmunk.cache.get("foo")).to.be.null;
    });

    it("drops single value from cache", () => {
      chipmunk.cache.set("foo", "bar");
      chipmunk.cache.set("baz", "bam");

      chipmunk.cache.remove("baz");
      expect(chipmunk.cache.get("foo")).to.equal("bar");
      expect(chipmunk.cache.get("baz")).to.be.null;
    });

    it("drops multiple values from cache by prefix", () => {
      chipmunk.cache.set("mallorca-foo", "bar");
      chipmunk.cache.set("menorca-foo", "bar");
      chipmunk.cache.set("mallorca-baz", "bam");

      chipmunk.cache.remove("mallorca*");
      expect(chipmunk.cache.get("mallorca-foo")).to.be.null;
      expect(chipmunk.cache.get("mallorca-baz")).to.be.null;
      expect(chipmunk.cache.get("menorca-foo")).to.equal("bar");
    });
  });

  describe("convenience functionality", () => {
    it("updates existing value", () => {
      chipmunk.cache.set("foo", 2);
      chipmunk.cache.update("foo", (value) => value + 1);

      expect(chipmunk.cache.get("foo")).to.equal(3);
    });

    it("updates or creates a value", () => {
      chipmunk.cache.update("foo", (value) => value + 1, { defaultValue: 5 });

      expect(chipmunk.cache.get("foo")).to.equal(6);
    });

    it(`saves into cache, taking into account the current's config cache relevant headers`, () => {
      chipmunk.updateConfig({
        headers: { "Affiliation-Id": null, "Role-Id": 5 },
      });
      chipmunk.cache.set("foo", "bar");
      expect(chipmunk.cache.get("foo")).to.equal("bar");

      chipmunk.updateConfig({
        headers: { "Affiliation-Id": null, "Role-Id": 8 },
      });
      expect(chipmunk.cache.get("foo")).to.be.null;
    });
  });
});
