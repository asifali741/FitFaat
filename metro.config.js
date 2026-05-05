const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : (config.resolver.blockList ? [config.resolver.blockList] : [])),
  /.*[/\\]node_modules[/\\]expo-modules-autolinking[/\\]android[/\\].*[/\\]build[/\\].*/,
];
 
module.exports = withNativeWind(config, { input: './global.css' })
