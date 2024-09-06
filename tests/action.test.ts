import "mocha";
import { expect } from "chai";
import { get } from "lodash";
import nock from "nock";

import createChipmunk from "../src";
import { setup, matches } from "./setup";
import { emptyOrganizationAssociations } from "./emptyAssociations";

const config = setup();
let chipmunk;

describe("action", () => {
  beforeEach(() => {
    chipmunk = createChipmunk(config);
  });

  it("queries for users", async () => {
    nock(config.endpoints.um)
      .get(matches("/users"))
      .reply(200, {
        members: [
          {
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: "first",
          },
          {
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: "second",
          },
        ],
      });

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "query");
      expect(result.objects.length).to.be.gt(1);
    });
  });

  it(`moves association reference into '@associations'`, async () => {
    nock(config.endpoints.um)
      .get(matches("/users"))
      .reply(200, {
        members: [
          {
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: "first",
            organization: { "@id": "http://um.app/organization/1" },
          },
          {
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: "second",
          },
        ],
      });

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "query");
      expect(result.object["@associations"].organization).to.eql(
        "http://um.app/organization/1"
      );
    });
  });

  // this is required because subclasses can have associations defined the super class has not
  // in this example the manager context has a 'geo_scopes' association, which the base user context is lacking
  it(`moves subclass specific association references`, async () => {
    nock(config.endpoints.um)
      .get(matches("/users"))
      .reply(200, {
        members: [
          {
            "@context":
              "https://um.api.mediastore.dev/v20140601/context/user/manager",
            id: "first",
            organization: { "@id": "http://um.app/organizations/1" },
            geo_scopes: [
              {
                "@id": "https://um.api.mediastore.dev/v20140601/geo_scope/UGA",
              },
              {
                "@id": "https://um.api.mediastore.dev/v20140601/geo_scope/SWZ",
              },
            ],
          },
          {
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: "second",
            organization: { "@id": "http://um.app/organizations/1" },
          },
        ],
      });

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "query");
      expect(result.objects[0]["@associations"].organization).to.equal(
        "http://um.app/organizations/1"
      );
      expect(result.objects[0]["@associations"].geo_scopes).to.eql([
        "https://um.api.mediastore.dev/v20140601/geo_scope/UGA",
        "https://um.api.mediastore.dev/v20140601/geo_scope/SWZ",
      ]);

      expect(result.objects[1]["@associations"].organization).to.equal(
        "http://um.app/organizations/1"
      );
    });
  });

  it(`returns pagination results`, async () => {
    nock(config.endpoints.um)
      .get(matches("/users"))
      .reply(200, {
        members: [
          {
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: "first",
          },
        ],
        "@total_pages": 3,
        "@total_count": 14,
        "@current_page": 1,
      });

    const expected = {
      total_pages: 3,
      total_count: 14,
      current_page: 1,
    };

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "query");
      expect(result.pagination).to.eql(expected);
    });
  });

  it(`returns reformatted aggregations`, async () => {
    nock(config.endpoints.um)
      .get(matches("/users"))
      .reply(200, {
        members: [
          {
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: "first",
          },
        ],
        aggregations: {
          count_by_gender: {
            buckets: [
              { key: "male", doc_count: 13 },
              { key: "female", doc_count: 21 },
            ],
          },
        },
      });

    const expected = {
      count_by_gender: [
        { value: "male", count: 13 },
        { value: "female", count: 21 },
      ],
    };

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "query");
      expect(result.aggregations).to.eql(expected);
    });
  });

  it("sends uri params", async () => {
    nock(config.endpoints.um).get(matches("users/1659")).reply(200, {
      "@context": "https://um.api.mediastore.dev/v20140601/context/user",
      id: "one",
    });

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "get", {
        params: { user_ids: 1659 },
      });
      expect(result.objects.length).to.equal(1);
    });
  });

  it("uses forced member action endpoint", async () => {
    nock(config.endpoints.um).get(matches("user/1659")).reply(200, {
      "@context": "https://um.api.mediastore.dev/v20140601/context/user",
      id: "one",
    });

    await chipmunk.action("um.user", "member.get", {
      params: { user_id: 1659 },
    });
  });

  it("sends additional params", async () => {
    nock(config.endpoints.um)
      .get(matches("users"))
      .query({ sort: "created_at" })
      .reply(200, {});

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "query", {
        params: { sort: "created_at" },
      });
      expect(result).to.be.ok;
    });
  });

  it("sends additional headers", async () => {
    chipmunk.updateConfig({ headers: { "Session-Id": "56BA" } });

    nock(config.endpoints.um)
      .matchHeader("Session-Id", "56BA")
      .matchHeader("Funky-Header", "hu")
      .get(matches("users"))
      .reply(200, {});

    const promise = chipmunk.action("um.user", "query", {
      headers: { "Funky-Header": "hu", Ignored: null },
    });
    await expect(promise).to.be.fulfilled;
  });

  // 'badheaders' option seems not to work with superagent :(
  it("does not send a session id", async () => {
    chipmunk.updateConfig({ headers: { "Session-Id": "56BA" } });

    nock(config.endpoints.um)
      // nock performs a string check on the value. meaning we have to check for Session-Id to equal to '' to verify it is not sent
      .matchHeader("Session-Id", "")
      .get(matches("users"))
      .reply(404, {});

    const promise = chipmunk.action("um.user", "query", {
      headers: { "Session-Id": null },
    });
    await expect(promise).to.be.rejected;
  });

  it("resolves schema", async () => {
    nock(config.endpoints.um)
      .get(matches("/users"))
      .reply(200, {
        members: [
          {
            "@type": "user",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            "@id": "https://um.api.mediastore.dev/v20140601/user/1",
            organization: {
              "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
            },
            id: 1,
            first_name: "philipp",
            last_name: "goetzinger",
            gender: "male",
          },
          {
            "@type": "user",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            "@id": "https://um.api.mediastore.dev/v20140601/user/2",
            organization: {
              "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
            },
            id: 2,
            first_name: "antonie",
            gender: "female",
          },
        ],
      })

      .get(matches("/organizations/3"))
      .reply(200, {
        members: [
          {
            "@type": "organization",
            "@context":
              "https://um.api.mediastore.dev/v20140601/context/organization",
            "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
            id: 3,
            name: "graefschaft",
          },
        ],
      });

    const expected = [
      {
        "@type": "user",
        "@context": "https://um.api.mediastore.dev/v20140601/context/user",
        "@id": "https://um.api.mediastore.dev/v20140601/user/1",
        "@associations": {
          organization:
            "https://um.api.mediastore.dev/v20140601/organization/3",
        },
        first_name: "philipp",
        last_name: "goetzinger",
        organization: {
          "@type": "organization",
          "@context":
            "https://um.api.mediastore.dev/v20140601/context/organization",
          "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
          "@associations": {},
          id: 3,
          name: "graefschaft",
        },
      },
      {
        "@type": "user",
        "@context": "https://um.api.mediastore.dev/v20140601/context/user",
        "@id": "https://um.api.mediastore.dev/v20140601/user/2",
        "@associations": {
          organization:
            "https://um.api.mediastore.dev/v20140601/organization/3",
        },
        first_name: "antonie",
        organization: {
          "@type": "organization",
          "@context":
            "https://um.api.mediastore.dev/v20140601/context/organization",
          "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
          "@associations": {},
          id: 3,
          name: "graefschaft",
        },
      },
    ];

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "query", {
        proxy: false,
        schema: "first_name, last_name, organization { name }",
      });

      expect(result.objects).to.eql(expected);
    });
  });

  it("resolves schema, where associations attributes are not specified", async () => {
    nock(config.endpoints.um)
      .get(matches("/users"))
      .reply(200, {
        members: [
          {
            "@type": "user",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            "@id": "https://um.api.mediastore.dev/v20140601/user/1",
            organization: {
              "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
            },
            geo_scopes: [
              {
                "@id": "https://um.api.mediastore.dev/v20140601/geo_scope/UGA",
              },
              {
                "@id": "https://um.api.mediastore.dev/v20140601/geo_scope/SWZ",
              },
            ],
            id: 1,
            first_name: "philipp",
            last_name: "goetzinger",
            gender: "male",
          },
          {
            "@type": "user",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            "@id": "https://um.api.mediastore.dev/v20140601/user/2",
            organization: {
              "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
            },
            id: 2,
            first_name: "antonie",
            gender: "female",
          },
        ],
      })

      .get(matches("/organizations/3"))
      .reply(200, {
        members: [
          {
            "@type": "organization",
            "@context":
              "https://um.api.mediastore.dev/v20140601/context/organization",
            "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
            id: 3,
            name: "graefschaft",
          },
        ],
      });

    const expected = [
      {
        "@type": "user",
        "@context": "https://um.api.mediastore.dev/v20140601/context/user",
        "@id": "https://um.api.mediastore.dev/v20140601/user/1",
        "@associations": {
          organization:
            "https://um.api.mediastore.dev/v20140601/organization/3",
          geo_scopes: [
            "https://um.api.mediastore.dev/v20140601/geo_scope/UGA",
            "https://um.api.mediastore.dev/v20140601/geo_scope/SWZ",
          ],
        },
        first_name: "philipp",
        last_name: "goetzinger",
        organization: {
          ...emptyOrganizationAssociations,
          "@type": "organization",
          "@context":
            "https://um.api.mediastore.dev/v20140601/context/organization",
          "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
          "@associations": {},
          id: 3,
          name: "graefschaft",
        },
      },
      {
        "@type": "user",
        "@context": "https://um.api.mediastore.dev/v20140601/context/user",
        "@id": "https://um.api.mediastore.dev/v20140601/user/2",
        "@associations": {
          organization:
            "https://um.api.mediastore.dev/v20140601/organization/3",
        },
        first_name: "antonie",
        organization: {
          ...emptyOrganizationAssociations,
          "@type": "organization",
          "@context":
            "https://um.api.mediastore.dev/v20140601/context/organization",
          "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
          "@associations": {},
          id: 3,
          name: "graefschaft",
        },
      },
    ];

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "query", {
        proxy: false,
        schema: "first_name, last_name, organization",
      });

      expect(result.objects).to.eql(expected);
    });
  });

  it("resolves schema for mm3 models", async () => {
    nock(config.endpoints.my)
      .get(matches("/bicycles"))
      .reply(200, {
        members: [
          {
            $id: "https://my.api.mediastore.dev/v2021/bicycles/1659",
            $schema:
              "https://my.api.mediastore.dev/v2021/schemas/my.bicycle.json",
            $links: {
              manufacturer:
                "https://my.api.mediastore.dev/v2021/manufacturers/3",
              previous_owners:
                "https://um.api.mediastore.dev/v20140601/users/104,105",
              activities:
                "https://my.api.mediastore.dev/v2021/bicycles/1659/activities",
            },
            id: 1659,
            manufacturer_id: 3,
            previous_owner_ids: [104, 105],
          },
          {
            $id: "https://my.api.mediastore.dev/v2021/bicycles/1660",
            $schema:
              "https://my.api.mediastore.dev/v2021/schemas/my.bicycle.json",
            $links: {
              manufacturer:
                "https://my.api.mediastore.dev/v2021/manufacturers/4",
              previous_owners:
                "https://um.api.mediastore.dev/v20140601/users/105,106,107,108", // overlap!
              activities:
                "https://my.api.mediastore.dev/v2021/bicycles/1660/activities",
            },
            id: 1660,
            manufacturer_id: 4,
            previous_owner_ids: [105, 106, 107, 108],
          },
        ],
      });

    nock(config.endpoints.my)
      .get(matches("/manufacturers/3,4"))
      .reply(200, {
        members: [
          {
            $id: "https://my.api.mediastore.dev/v2021/manufacturers/3",
            $schema:
              "https://my.api.mediastore.dev/v2021/schemas/my.manufacturer.json",
            id: 3,
            name: "kona",
          },
          {
            $id: "https://my.api.mediastore.dev/v2021/manufacturers/4",
            $schema:
              "https://my.api.mediastore.dev/v2021/schemas/my.manufacturer.json",
            id: 4,
            name: "all city",
          },
        ],
      });

    nock(config.endpoints.my)
      .get(matches("/bicycles/1659,1660/activities"))
      .reply(200, {
        members: [
          {
            $id: "https://my.api.mediastore.dev/v2021/activities/1659",
            $schema:
              "https://my.api.mediastore.dev/v2021/schemas/my.activity.json",
            bicycle_id: 1659,
          },
          {
            $id: "https://my.api.mediastore.dev/v2021/activities/1660",
            $schema:
              "https://my.api.mediastore.dev/v2021/schemas/my.activity.json",
            bicycle_id: 1660,
          },
        ],
      });

    nock(config.endpoints.um)
      .post(matches("/users/search"))
      .reply(200, {
        members: [
          {
            "@id": "https://um.api.mediastore.dev/v20140601/user/104",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: 104,
          },
          {
            "@id": "https://um.api.mediastore.dev/v20140601/user/105",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: 105,
          },
          {
            "@id": "https://um.api.mediastore.dev/v20140601/user/106",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: 106,
          },
          {
            "@id": "https://um.api.mediastore.dev/v20140601/user/107",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: 107,
          },
          {
            "@id": "https://um.api.mediastore.dev/v20140601/user/108",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            id: 108,
          },
        ],
      });

    await chipmunk.run(async (ch) => {
      const result = await ch.action("mm3:my.bicycle", "query", {
        proxy: false,
        schema: "id, manufacturer, previous_owners, activities",
      });

      expect(result.objects[0].manufacturer).not.to.be.null;
      expect(result.objects[0].previous_owners.length).to.be.gt(0);
    });
  });

  it("auto-extends schema if needed", async () => {
    // this is required if you ask for less attributes that are needed to resolve associated data
    nock(config.endpoints.my)
      .get(matches("/bicycles"))
      .reply(200, {
        members: [
          {
            $id: "https://my.api.mediastore.dev/v2021/bicycles/1659",
            $schema:
              "https://my.api.mediastore.dev/v2021/schemas/my.bicycle.json",
            $links: {
              manufacturer:
                "https://my.api.mediastore.dev/v2021/manufacturers/3",
            },
            id: 1659,
            manufacturer_id: 3,
          },
        ],
      });

    nock(config.endpoints.my)
      .get(matches("/manufacturers/3"))
      .reply(200, {
        members: [
          {
            $id: "https://my.api.mediastore.dev/v2021/manufacturers/3",
            $schema:
              "https://my.api.mediastore.dev/v2021/schemas/my.manufacturer.json",
            id: 3,
            name: "kona",
          },
        ],
      });

    await chipmunk.run(async (ch) => {
      const result = await ch.action("mm3:my.bicycle", "query", {
        proxy: false,
        schema: "id, manufacturer { name }", // misses the manufacturer's `id`
      });

      expect(result.objects[0].manufacturer).not.to.be.null;
      expect(result.objects[0].manufacturer.id).to.eq(3)
    });
  });

  it("resolves schema with, skipping associations that cannot be resolved", async () => {
    nock(config.endpoints.um)
      .get(matches("/users"))
      .reply(200, {
        members: [
          {
            "@type": "user",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            "@id": "https://um.api.mediastore.dev/v20140601/user/1",
            organization: {
              "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
            },
            id: 1,
            first_name: "philipp",
            last_name: "goetzinger",
            gender: "male",
          },
          {
            "@type": "user",
            "@context": "https://um.api.mediastore.dev/v20140601/context/user",
            "@id": "https://um.api.mediastore.dev/v20140601/user/2",
            organization: {
              "@id": "https://um.api.mediastore.dev/v20140601/organization/3",
            },
            id: 2,
            first_name: "antonie",
            gender: "female",
          },
        ],
      })

      .get(matches("/organizations/3"))
      .reply(404, {});

    const expected = [
      {
        "@type": "user",
        "@context": "https://um.api.mediastore.dev/v20140601/context/user",
        "@id": "https://um.api.mediastore.dev/v20140601/user/1",
        "@associations": {
          organization:
            "https://um.api.mediastore.dev/v20140601/organization/3",
        },
        first_name: "philipp",
        last_name: "goetzinger",
        organization: null,
      },
      {
        "@type": "user",
        "@context": "https://um.api.mediastore.dev/v20140601/context/user",
        "@id": "https://um.api.mediastore.dev/v20140601/user/2",
        "@associations": {
          organization:
            "https://um.api.mediastore.dev/v20140601/organization/3",
        },
        first_name: "antonie",
        organization: null,
      },
    ];

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "query", {
        proxy: false,
        schema: "first_name, last_name, organization { name }",
      });

      expect(result.objects).to.eql(expected);
    });
  });

  it("returns raw results", async () => {
    nock(config.endpoints.um)
      .get(matches("/users"))
      .reply(200, {
        members: [
          { id: "first", organization: { name: "nested" } },
          { id: "second" },
        ],
      });

    const expected = { id: "first", organization: { name: "nested" } };

    await chipmunk.run(async (ch) => {
      const result = await ch.action("um.user", "query", { raw: true });
      expect(result.objects[0]).to.eql(expected);
    });
  });

  it("sends a PUT request", async () => {
    nock(config.endpoints.um).put(matches("/users/3/invite")).reply(200, {});

    await chipmunk.action("um.user", "invite", { params: { user_ids: 3 } });
  });

  it("sends a PATCH request", async () => {
    nock(config.endpoints.um).patch(matches("/users/3")).reply(200, {});

    await chipmunk.action("um.user", "update", {
      params: { user_ids: 3 },
      body: {},
    });
  });

  it("sends a DELETE request", async () => {
    nock(config.endpoints.um).delete(matches("/users/3")).reply(200, {});

    await chipmunk.action("um.user", "delete", { params: { user_ids: 3 } });
  });

  describe("proxied via tuco", () => {
    it("throws an error if proxy was requested but no schema given", async () => {
      const block = chipmunk.run(async (ch) => {
        await ch.action("um.user", "query", {
          proxy: true,
        });
      });

      await expect(block).to.be.rejectedWith(
        /supported only if a schema is given/
      );
    });

    it("forwards the request to tuco", async () => {
      let body;
      nock(config.endpoints.tuco)
        .post(matches("/proxy"), (_body) => {
          body = _body;
          return true; // checking body later..
        })
        .reply(200, {
          members: [
            {
              "@context":
                "https://um.api.mediastore.dev/v20140601/context/user",
              id: "first",
            },
            {
              "@context":
                "https://um.api.mediastore.dev/v20140601/context/user",
              id: "second",
            },
          ],
        });

      await chipmunk.action("um.user", "query", {
        schema: "id, first_name",
      });

      expect(get(body, "config.headers")).to.exist;
      expect(get(body, "config.errorInterceptor")).not.to.exist;
      expect(get(body, "config.watcher")).not.to.exist;

      expect(get(body, "opts.schema")).to.exist;
      expect(get(body, "opts.proxy")).not.to.exist;
    });
  });
});
