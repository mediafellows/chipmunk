import { expect } from "chai";
import axios from "axios";
import nock from "nock";

describe("Axios + AbortController", () => {
  beforeEach(() => nock.cleanAll());

  it("should cancel the request", async function () {
    nock("https://api.example.com")
      .get("/users")
      .delay(1000)
      .reply(200, { users: [] });

    const controller = new AbortController();
    const promise = axios.get("https://api.example.com/users", {
      signal: controller.signal,
    });

    // Give the request a tick to start
    setImmediate(() => controller.abort());

    try {
      await promise;
      throw new Error("Expected promise to be rejected");
    } catch (err) {
      expect(err).to.have.property("code", "ERR_CANCELED");
    }
  });
});