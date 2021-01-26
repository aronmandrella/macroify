module.exports = {
  sourceType: "unambiguous",
  comments: false,
  presets: [
    [
      "@babel/preset-env",
      {
        useBuiltIns: "usage",
        corejs: require("core-js/package.json").version,
        targets: {
          node: "11",
        },
      },
    ],
  ],
};
