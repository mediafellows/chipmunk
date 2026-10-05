const path = require("path");

module.exports = {
  entry: ["./src/bundle.ts"],
  output: {
    filename: "chipmunk.bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".js", ".ts"],
    fallback: {
      "http": false,
      "https": false,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: 'tsconfig.es5.json',
            },
          },
        ],
      },
    ],
  },
};
