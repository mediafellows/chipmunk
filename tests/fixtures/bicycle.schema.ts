export default {
  $id: "https://my.api.mediastore.dev/v2021/schemas/my.bicycle.json",
  type: "object",
  title: "my bicycle",
  default: {},
  additionalProperties: false,
  properties: {
    id: {
      type: "integer",
    },
    brand: {
      type: "string",
    },
    previous_owner_ids: {
      type: "array",
      items: {
        type: "integer",
      },
    },
    manufacturer_id: {
      type: "integer",
    },
    wheel_ids: {
      type: "array",
      items: {
        type: "integer",
      },
    },
    meta: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: {
          minLength: 2,
          maxLength: 128,
          type: "string",
        },
      },
    },
    owner_id: {
      type: "integer",
    },
    owner: {
      $jsonld_context: "https://um.api.mediastore.dev/v20140601/context/user",
    },
    previous_owners: {
      type: "array",
      items: {
        $jsonld_context:
          "https://um.api.mediastore.dev/v20140601/context/user",
      },
    },
    manufacturer: {
      anyOf: [
        { $ref: "https://my.api.mediastore.dev/v2021/schemas/my.manufacturer.json" },
        { type: "null" },
      ]
    },
    wheels: {
      type: "array",
      items: {
        $ref: "https://my.api.mediastore.dev/v2021/schemas/my.wheeel.json",
      },
    },
    activities: {
      type: "array",
      items: {
        $ref: "https://my.api.mediastore.dev/v2021/schemas/my.activity.json",
      },
    },
  },
  actions: {
    query: {
      method: "get",
      template: "https://my.api.mediastore.dev/v2021/bicycles",
      mappings: [],
    },
  },
};
