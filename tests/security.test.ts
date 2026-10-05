import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import createConfig from "../src/config";
import { request } from "../src/request";
import { setup } from "./setup";

setup();
describe("request URL security", () => {
  const rejected = [
    "https://untrusted.example/api.mediastore",
    "https://api.mediastore.untrusted.example/",
    "https://localhost.untrusted.example/",
    "https://apiXmediastore.com/",
    "https://untrusted.example/?host=localhost",
    "https://localhost@untrusted.example/",
    "https://name:password@um.api.mediastore.dev/",
    "ftp://um.api.mediastore.dev/file",
    "data:text/plain,localhost",
    "file:///localhost/file",
    "//um.api.mediastore.dev/file",
    "/relative/localhost",
  ];
  for (const url of rejected) {
    it(`rejects ${url} before invoking the transport`, async () => {
      const adapter = sinon
        .stub()
        .resolves({
          status: 200,
          statusText: "OK",
          data: {},
          headers: {},
          config: {},
        });
      await expect(
        request(createConfig()).get(url, { adapter }),
      ).to.be.rejectedWith(/^unsupported URL$/);
      expect(adapter.notCalled).to.equal(true);
    });
  }
  for (const url of [
    "https://um.api.mediastore.dev/",
    "https://um.api.mediastore.com/",
    "https://api.nbcupassport.com/",
    "http://localhost:1234/",
    "http://127.0.0.1:1234/",
    "http://[::1]:1234/",
  ]) {
    it(`accepts the trusted URL ${url}`, async () => {
      const adapter = sinon
        .stub()
        .resolves({
          status: 200,
          statusText: "OK",
          data: {},
          headers: {},
          config: {},
        });
      await request(createConfig()).get(url, { adapter });
      expect(adapter.calledOnce).to.equal(true);
    });
  }
});
