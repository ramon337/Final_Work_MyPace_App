import { React, useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { supabase } from './src/lib/supabase';
import CrewIcon from './src/components/icons/CrewIcon';
import QuestIcon from './src/components/icons/QuestIcon';
import ProfileIcon from './src/components/icons/ProfileIcon';
import { UserProvider } from './src/context/UserContext';

// Importeer je schermen
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';
import MeetBuddyScreen from './src/screens/onboarding/MeetBuddyScreen';
import AccountSetupScreen from './src/screens/onboarding/AccountSetupScreen';
import LoginScreen from './src/screens/onboarding/LoginScreen';
import CrewScreen from './src/screens/dashboard/CrewScreen';
import QuestsScreen from './src/screens/dashboard/QuestsScreen';
import YouScreen from './src/screens/dashboard/YouScreen';

import StravaSyncScreen from './src/screens/dashboard/StravaSyncScreen';

import { COLORS } from './src/theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- 1. JOUW NIEUWE BOTTOM TAB NAVIGATOR ---
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
          // In plaats van Ionicons, returnen we nu JOUW componenten!
          // We geven de 'color' (oranje of grijs) en 'size' mooi door.
          
          if (route.name === 'Crew') {
            // Misschien heb je een aparte SVG voor focused (solid) vs unfocused (outline)?
            // Zo ja, dan kun je hier if(focused) { return <CrewIconSolid /> } doen.
            return <CrewIcon color={color} size={size} />;
            
          } else if (route.name === 'Quests') {
            return <QuestIcon color={color} size={size} />;
            
          } else if (route.name === 'You') {
            return <ProfileIcon color={color} size={size} />;
          }
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
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(false); 

  // 1. ALLE HOOKS BOVENAAN (Voor de if-statements!)
  const [fontsLoaded] = useFonts({
    'Baloo-Bold': require('./src/assets/fonts/Baloo2-Bold.ttf'),
    // 'Inter': require('./src/assets/fonts/Inter-Regular.ttf'), 
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true); 
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2. NU PAS DE CONDITIES EN RETURNS
  // Als we óf op Supabase wachten, óf op de fonts wachten, toon het laadscherm:
  if (!isReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primaryOrange} />
      </View>
    );
  }

  // 3. ALS ALLES GELADEN IS, TOON DE NAVIGATIE
  return (
    <UserProvider>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {session && session.user ? (
          /* --- INGELOGD --- */
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="StravaSync" component={StravaSyncScreen} />
          </>
        ) : (
          /* --- NIET INGELOGD --- */
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="MeetBuddy" component={MeetBuddyScreen} />
            <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
    </UserProvider>
  );
}