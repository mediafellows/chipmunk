export default {
  $id: "https://my.api.mediapeers.mobi/v2021/schemas/my.manufacturer.json",
  type: "object",
  title: "my manufacturer",
  default: {},
  additionalProperties: false,
  properties: {
    id: {
      type: "integer",
    },
    name: {
      type: "string",
    },
  },
  actions: {
    get: {
      method: "get",
      template: "/v2021/manufacturers/{manufacturer_ids}",
      mappings: [
        {
          variable: "manufacturer_ids",
          source: "id",
        },
      ],
    },
  },
};
