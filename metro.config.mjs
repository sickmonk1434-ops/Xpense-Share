import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(import.meta.dirname);

export default withNativeWind(config, { input: "./src/theme/global.css" });
