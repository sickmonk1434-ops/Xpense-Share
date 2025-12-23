import { View, ActivityIndicator, Text } from "react-native";
import { router } from "expo-router";

export default function Page() {
    // Clerk handles the redirect logic automatically when the route matches.
    // We just need this route to exist so Expo Router doesn't show an error.
    return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: 'white' }}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={{ marginTop: 10, color: '#64748b' }}>Completing sign in...</Text>
        </View>
    );
}
