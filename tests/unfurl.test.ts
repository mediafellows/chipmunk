import { expect } from "chai";
import nock from "nock";
import createChipmunk from "../src";
import { setup } from "./setup";

const config = setup();
const origin = "https://um.api.mediastore.dev";

describe("unfurl pagination", () => {
  it("collects pages in page order even when later pages finish first", async () => {
    const client = createChipmunk(config);
    const scopes = [1, 2, 3].map((page) =>
      nock(origin)
        .get("/v20140601/users")
        .query({ page: String(page), per: "2" })
        .delay(page === 2 ? 20 : 0)
        .reply(200, {
          members: [{ id: page }],
          total_pages: 3,
          total_count: 3,
          current_page: page,
        }),
    );
    const opts = { params: { page: 1, per: 2 } };
    const result = await client.unfurl("um.user", "query", opts);
    expect(result.objects.map((object) => object.id)).to.eql([1, 2, 3]);
    expect(result.pagination.total_pages).to.equal(1);
    expect(opts).to.eql({ params: { page: 1, per: 2 } });
    scopes.forEach((scope) => scope.done());
  });

  it("starts at the requested page without refetching previous pages", async () => {
    const client = createChipmunk(config);
    const scopes = [2, 3].map((page) =>
      nock(origin)
        .get("/v20140601/users")
        .query({ page: String(page), per: "2" })
        .reply(200, {
          members: [{ id: page }],
          total_pages: 3,
          total_count: 3,
          current_page: page,
        }),
    );
    const result = await client.unfurl("um.user", "query", {
      params: { page: 2, per: 2 },
    });
    expect(result.objects.map((object) => object.id)).to.eql([2, 3]);
    scopes.forEach((scope) => scope.done());
  });

  it("propagates a later page failure and clears request bookkeeping", async () => {
    const client = createChipmunk(config);
    const first = nock(origin)
      .get("/v20140601/users")
      .query({ page: "1", per: "2" })
      .reply(200, {
        members: [{ id: 1 }],
        total_pages: 2,
        total_count: 2,
        current_page: 1,
      });
    const second = nock(origin)
      .get("/v20140601/users")
      .query({ page: "2", per: "2" })
      .reply(503, { description: "page unavailable" });
    await expect(
      client.unfurl("um.user", "query", { params: { page: 1, per: 2 } }),
    ).to.be.rejected;
    expect(client.currentConfig().watcher.pendingRequests).to.eql({});
    first.done();
    second.done();
  });

  it("returns an unpaginated response without additional requests", async () => {
    const scope = nock(origin)
      .get("/v20140601/users")
      .reply(200, { members: [{ id: 7 }] });
    const result = await createChipmunk(config).unfurl("um.user", "query");
    expect(result.objects).to.eql([{ id: 7 }]);
    expect(result.pagination).to.be.undefined;
    scope.done();
  });
});
import "mocha";
