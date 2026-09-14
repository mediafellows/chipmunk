const path = require("node:path");
require("ts-node").register({
  project: path.resolve(__dirname, "../tsconfig.test.json"),
});
