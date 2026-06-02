// src/screens/onboarding/MeetBuddyScreen.js
import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from "react-native";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import CustomButton from "../../components/ui/CustomButton";

import cheerAnimation from "../../assets/animations/mascot-cheering.json";

export default function MeetBuddyScreen({ navigation }) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const animationRef = useRef(null);

  const phases = [
    {
      body: null, 
      buttonText: "Continue", // 🚀 Aangepast naar Continue
      animation: cheerAnimation, // 💡 Zwaaiende mascotte
      isLarge: true,
    },
    {
      body: "Hello, I'm your Buddy! I'll guide you through this experience...",
      buttonText: "I got it",
      animation: cheerAnimation, // 💡 Pratende mascotte
      isLarge: false,
    },
    {
      body: "At MyPace, we don't care about your speed. Showing up consistently for a relaxed run is way more valuable than pushing your limits and burning out.",
      buttonText: "Makes sense",
      animation: cheerAnimation, // 💡 Pratende mascotte
      isLarge: false,
    },
    {
      body: "Let's get to know you and make your account!",
      buttonText: "Let's go",
      animation: cheerAnimation, // 💡 Pratende mascotte
      isLarge: false,
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (animationRef.current) animationRef.current.play();
    }, 150);
    return () => clearTimeout(timer);
  }, [currentPhase]);

  const handleNext = () => {
    if (currentPhase < phases.length - 1) {
      setCurrentPhase(currentPhase + 1);
    } else {
      navigation.navigate("AccountSetup");
    }
  };

  const handleBack = () => {
    if (currentPhase > 0) {
      setCurrentPhase(currentPhase - 1);
    } else {
      navigation.goBack();
    }
  };

  const current = phases[currentPhase];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* 🚀 Titel is nu ALLEEN zichtbaar in fase 0 (wanneer isLarge true is) */}
      {current.isLarge && (
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Meet your running partner!</Text>
        </View>
      )}

      <View style={styles.contentWrapper}>
        {current.body && (
          <View style={styles.bubbleContainer}>
            <View style={styles.speechBubbleCard}>
              <Text style={styles.body}>{current.body}</Text>
            </View>
          </View>
        )}

        <View style={[styles.imageContainer, current.isLarge ? styles.imageLargeContainer : styles.imageSmallContainer]}>
          <LottieView
            ref={animationRef}
            key={currentPhase}
            source={current.animation}
            autoPlay={false}
            loop={true}
            renderMode="SOFTWARE"
            style={current.isLarge ? styles.lottieLarge : styles.lottieSmall}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <CustomButton title={current.buttonText} type="primary" onPress={handleNext} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: "space-between", alignItems: "center", paddingVertical: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', width: '90%', marginTop: 10 },
  backButton: { padding: 10, marginLeft: -10 },
  headerContainer: { alignItems: "center", width: "90%", marginBottom: 10 },
  title: { fontSize: 32, fontFamily: "Baloo-Bold", color: COLORS.primaryOrange, textAlign: "center", lineHeight: 38, marginTop: 20 },
  contentWrapper: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  bubbleContainer: { width: '100%', alignItems: 'center', zIndex: 10, marginBottom: 20, marginTop: 40 }, // Toegevoegde marginTop compenseert voor missende titel
  speechBubbleCard: { backgroundColor: COLORS.cardBackground, padding: 24, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', width: '95%', justifyContent: 'center' },
  body: { fontSize: 16, fontFamily: "Inter", textAlign: "left", color: COLORS.textLight, lineHeight: 24 },
  imageContainer: { width: "100%" },
  imageLargeContainer: { justifyContent: "center", alignItems: "center", flex: 1 },
  imageSmallContainer: { alignItems: "flex-start"},
  lottieLarge: { width: 450, height: 450 }, // 🚀 Nog groter gemaakt (was 320)
  lottieSmall: { width: 250, height: 250}, // 🚀 Iets groter gemaakt (was 200)
  buttonContainer: { width: "90%", marginBottom: 20 },
});