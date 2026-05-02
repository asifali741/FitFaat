module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: [
      // react-native-reanimated/plugin MUST be last — required for Reanimated v4 worklet bridge
      "react-native-reanimated/plugin",
    ],
  };
};