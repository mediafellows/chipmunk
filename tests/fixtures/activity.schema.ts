export default {
  $id: "https://my.api.mediapeers.mobi/v2021/schemas/my.activity.json",
  type: "object",
  title: "my activity",
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
      template: "https://my.api.mediapeers.mobi/v2021/activities/{activity_ids}",
      mappings: [
        {
          variable: "activity_ids",
          source: "id",
        },
      ],
    },
    query: {
      method: "get",
      template: "https://my.api.mediapeers.mobi/v2021/bicycles/{bicycle_ids}/activities",
      mappings: [
        {
          variable: "bicycle_ids",
          source: "bicycle_id",
        },
      ],
    },
  },
};
