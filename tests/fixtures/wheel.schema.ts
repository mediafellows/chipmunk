export default {
  $id: "https://my.api.mediapeers.mobi/v2021/schemas/my.wheel.json",
  type: "object",
  title: "my wheel",
  default: {},
  additionalProperties: false,
  properties: {
    id: {
      type: "integer",
    },
    size: {
      type: "string",
    },
  },
  actions: {
    get: {
      method: "get",
      template: "/v2021/wheels/{wheel_ids}",
      mappings: [
        {
          variable: "wheel_ids",
          source: "id",
        },
      ],
    },
  },
};
