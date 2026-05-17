const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)

const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

config.resolver.blockList = [
  ...existingBlockList,
  /.*[/\\]node_modules[/\\]expo-modules-autolinking[/\\]android[/\\].*[/\\]build[/\\].*/,
  /.*[/\\]node_modules[/\\]expo-modules-core[/\\]expo-module-gradle-plugin[/\\](build|\.gradle)[/\\].*/,
];
 
module.exports = withNativeWind(config, { input: './global.css' })
