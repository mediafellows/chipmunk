import "mocha";
import { expect } from "chai";

import format from "../src/format";

describe("format", () => {
  it("returns an equal object", () => {
    const input = { foo: "bar" };

    expect(format(input, false, false)).to.eql(input);
  });

  it("returns an object with useless data removed", () => {
    const input = {
      id: 3,
      name: "john",
      isMale: () => true,
      brothers: [{}, { name: "Lukas", errors: 2 }],
      errors: "none",
      "@associations": {},
    };

    const expected = {
      id: 3,
      name: "john",
      brothers: [{ name: "Lukas" }],
    };

    expect(format(input, false, false)).to.eql(expected);
  });

  it("returns a suitable multi action object", () => {
    const input = [{ id: 3, name: "john" }];
    const expected = {
      "3": { id: 3, name: "john" },
    };

    expect(format(input, true, false)).to.eql(expected);
  });

  it("returns a another suitable multi action object", () => {
    const input = [
      { id: 3, name: "john" },
      { id: 4, name: "lukas" },
    ];
    const expected = {
      "3": { id: 3, name: "john" },
      "4": { id: 4, name: "lukas" },
    };

    expect(format(input, true, false)).to.eql(expected);
  });

  it("returns a ruby-on-rails-nested-attributes object", () => {
    const input = {
      id: 3,
      name: "john",
      interest_ids: "3,4,5",
      brother: {
        id: 4,
        name: "lukas",
      },
    };
    const expected = {
      id: 3,
      name: "john",
      interest_ids: ["3", "4", "5"],
      brother_attributes: {
        id: 4,
        name: "lukas",
      },
    };

    expect(format(input, false, true)).to.eql(expected);
  });

  it("returns a multi action ruby-on-rails-nested-attributes object", () => {
    const input = [{
      id: 3,
      name: "john",
      interest_ids: "3,4,5",
      brother: {
        id: 4,
        name: "lukas",
      },
    }];

    const expected = {
      "3": {
        id: 3,
        name: "john",
        interest_ids: ["3", "4", "5"],
        brother_attributes: {
          id: 4,
          name: "lukas",
        },
      },
    };

    expect(format(input, true, true)).to.eql(expected);
  });
});
