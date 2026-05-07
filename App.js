import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // <-- Toegevoegd!
import { Ionicons } from '@expo/vector-icons'; // <-- Toegevoegd voor de icoontjes!

// Importeer je schermen
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';
import MeetBuddyScreen from './src/screens/onboarding/MeetBuddyScreen';
import AccountSetupScreen from './src/screens/onboarding/AccountSetupScreen';

import CrewScreen from './src/screens/dashboard/CrewScreen';
import QuestsScreen from './src/screens/dashboard/QuestsScreen';
import YouScreen from './src/screens/dashboard/YouScreen';

import { COLORS } from './src/theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- 1. JOUW NIEUWE BOTTOM TAB NAVIGATOR ---
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Stijl voor de titelbalk bovenin de dashboard schermen
        headerStyle: {
          backgroundColor: COLORS.background, 
          elevation: 0, // Haalt schaduw weg op Android
          shadowOpacity: 0, // Haalt schaduw weg op iOS
          borderBottomWidth: 0, // Zorgt voor een naadloze overgang
        },
        headerTitleStyle: {
          fontFamily: 'Baloo-Bold',
          color: COLORS.textLight || '#FFFFFF', 
          fontSize: 28,
        },
        // Stijl voor de navigatiebalk onderaan
        tabBarStyle: {
          backgroundColor: COLORS.cardBackground, 
          borderTopWidth: 0,
          height: 80, // Lekker ruim zodat je duim er makkelijk bij kan
          paddingBottom: 20, 
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.primaryOrange,
        tabBarInactiveTintColor: '#999999',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Crew') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Quests') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'You') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={28} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Crew" component={CrewScreen} />
      <Tab.Screen name="Quests" component={QuestsScreen} />
      <Tab.Screen name="You" component={YouScreen} />
    </Tab.Navigator>
  );
}

// --- 2. DE HOOFD NAVIGATOR ---
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
      {/* headerShown: false zorgt dat we geen lelijke standaard titelbalk bovenaan de onboarding krijgen */}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Jouw Onboarding Flow */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="MeetBuddy" component={MeetBuddyScreen} />
        <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
        
        {/* Jouw App Omgeving (Na de onboarding) */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}