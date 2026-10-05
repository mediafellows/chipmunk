const path = require("path");

module.exports = {
  entry: ["./src/bundle.ts"],
  target: ["web", "es2020"],
  output: {
    filename: "chipmunk.bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".js", ".ts"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: 'tsconfig.browser.json',
            },
          },
        ],
      },
    ],
  },
};
