import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importeer je schermen
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';
import MeetBuddyScreen from './src/screens/onboarding/MeetBuddyScreen';
import { COLORS } from './src/theme/colors';

// Maak de Navigator aan
const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Baloo-Bold': require('./src/assets/fonts/Baloo2-Bold.ttf'),
    // 'Inter': require('./src/assets/fonts/Inter-Regular.ttf'), // Zorg dat deze klopt met jouw bestand!
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primaryOrange} />
      </View>
    );
  }

  // NavigationContainer is de schil, Stack.Navigator bevat de schermen
  return (
    <NavigationContainer>
      {/* headerShown: false zorgt dat we geen lelijke standaard titelbalk bovenaan krijgen */}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="MeetBuddy" component={MeetBuddyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}