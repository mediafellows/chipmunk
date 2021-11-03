import "mocha";
import { expect } from "chai";
import schema from "../src/schema";

describe("config", () => {
  it("parses simple non-nested schema", () => {
    const input = `foo, bar,`;
    const expected = { foo: true, bar: true };

    expect(schema(input)).to.eql(expected);
  });

  it("parses nested schema", () => {
    const input = `foo, bar { baz { name }, }`;
    const expected = {
      foo: true,
      bar: {
        baz: {
          name: true,
        },
      },
    };

    expect(schema(input)).to.eql(expected);
  });

  it("deals with empty input", () => {
    const expected = {};

    expect(schema("")).to.eql(expected);
    expect(schema(null)).to.eql(expected);
  });
});
