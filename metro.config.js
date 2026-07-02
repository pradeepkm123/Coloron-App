// Metro configuration for Expo + React Native >=0.73
// Must extend expo/metro-config (not @react-native/metro-config) because
// this project uses the Expo SDK — Expo's Metro config handles
// .expo/.virtual-metro-entry and all Expo-specific resolver paths.
// Reference: https://docs.expo.dev/guides/customizing-metro/

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

module.exports = config;