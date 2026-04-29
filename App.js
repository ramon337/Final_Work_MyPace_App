import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useFonts } from "expo-font"; // De nieuwe tool die we net installeerden
import WelcomeScreen from "./src/screens/onboarding/WelcomeScreen";
import { COLORS } from "./src/theme/colors";

export default function App() {
  // 1. Hier laden we de lettertype-bestanden in vanuit je mappen
  const [fontsLoaded] = useFonts({
    "Baloo-Bold": require("./src/assets/fonts/Baloo2-Bold.ttf"),
    "Inter-Regular": require("./src/assets/fonts/Inter_18pt-Regular.ttf"),
  });

  // 2. Als de fonts nog aan het laden zijn, tonen we een oranje laad-icoontje
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // 3. Zodra alles is geladen, tonen we jouw welkomstscherm!
  return <WelcomeScreen />;
}
