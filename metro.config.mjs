import { getDefaultConfig } from "expo/metro-config";
import { withNativeWind } from "nativewind/metro-config";

const config = getDefaultConfig(import.meta.dirname);

export default withNativeWind(config, { input: "./src/theme/global.css" });
