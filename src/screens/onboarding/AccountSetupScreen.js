// src/screens/onboarding/AccountSetupScreen.js
import React, { useState } from "react";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import CustomButton from "../../components/ui/CustomButton";
import ProgressBar from "../../components/ui/ProgressBar";

export default function AccountSetupScreen({ navigation }) {
  // --- STATE ---
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState(null); // Voor stap 3
  const [selectedCrewAction, setSelectedCrewAction] = useState(null); // Voor stap 4

  const totalSteps = 5; // Verhoogd naar 5 stappen!

  // --- LOGICA ---
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      console.log("Setup Compleet! Navigeren naar Welcome...");
      navigation.navigate('MainTabs');
    }
  };

  const handleSkip = () => {
    // Wis de selectie van de huidige stap voordat we verder gaan
    if (currentStep === 3) {
      setSelectedGoal(null);
    } else if (currentStep === 4) {
      setSelectedCrewAction(null);
    }

    // Ga nu pas naar de volgende stap
    setCurrentStep(currentStep + 1);
  };

  // --- DYNAMISCHE ONDERKANT (Knoppen) ---
  const renderFooterButtons = () => {
    // 1. We bepalen eerst even slim wanneer de Continue knop wél zichtbaar is
    const showContinue = currentStep === 1 || currentStep === 2 || currentStep === 5 || (currentStep === 3 && selectedGoal !== null) || (currentStep === 4 && selectedCrewAction !== null);

    return (
      <View style={styles.footerWrapper}>
        {/* Vaste plek 1: De Primary Button (Continue) */}
        {/* Dit blokje is áltijd even hoog, of de knop er nu is of niet. 
            Hierdoor verspringt er nooit iets! */}
        <View style={styles.primaryButtonSlot}>{showContinue && <CustomButton title={currentStep === totalSteps ? "Finish Setup" : "Continue"} type="primary" onPress={handleNext} />}</View>

        {/* Vaste plek 2: De Skip Button (Onder de Continue knop) */}
        <View style={styles.skipButtonSlot}>
          {(currentStep === 3 || currentStep === 4) && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // --- DYNAMISCHE CONTENT ---
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Registration</Text>
            <Text style={styles.sectionLabel}>What's your name?</Text>
            <TextInput style={styles.input} placeholder="Enter your name" placeholderTextColor="#999999" />
            <Text style={styles.sectionLabel}>What's your email?</Text>
            <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor="#999999" keyboardType="email-address" autoCapitalize="none" />
            <Text style={styles.sectionLabel}>Choose your password</Text>
            <TextInput style={styles.input} placeholder="Enter your password" placeholderTextColor="#999999" secureTextEntry={true} />
          </View>
        );
      case 2:
        return (
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Pick a profile picture</Text>
            <Text style={styles.bodyText}>Show your crew who they are running with! You can always change this later.</Text>
            <View style={styles.avatarContainer}>
              <TouchableOpacity style={styles.avatarPlaceholder} activeOpacity={0.8}>
                <Ionicons name="camera" size={48} color={COLORS.textDark} />
                <View style={styles.plusBadge}>
                  <Ionicons name="add" size={20} color={COLORS.background} />
                </View>
              </TouchableOpacity>
              <Text style={styles.uploadText}>Tap to upload</Text>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Set your weekly goal</Text>
            <Text style={styles.bodyText}>Consistency is key! How many runs do you want to aim for each week?</Text>

            <View style={styles.optionsRow}>
              {[1, 2, 3].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.goalBox, selectedGoal === num && styles.boxSelected]}
                  // DEZE REGEL IS AANGEPAST:
                  onPress={() => setSelectedGoal(selectedGoal === num ? null : num)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.goalNumber, selectedGoal === num && styles.textSelected]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Stronger Together!</Text>
            <Text style={styles.bodyText}>Running is more fun with friends. What's your plan?</Text>

            {/* Optie 1: Invite */}
            <TouchableOpacity style={[styles.crewCard, selectedCrewAction === "invite" && styles.boxSelected]} onPress={() => setSelectedCrewAction(selectedCrewAction === "invite" ? null : "invite")}>
              <Text style={[styles.crewCardText, selectedCrewAction === "invite" && styles.textSelected]}>I have an invite code</Text>
            </TouchableOpacity>

            {/* Optie 2: Zoeken */}
            <TouchableOpacity style={[styles.crewCard, selectedCrewAction === "find" && styles.boxSelected]} onPress={() => setSelectedCrewAction(selectedCrewAction === "find" ? null : "find")}>
              <Text style={[styles.crewCardText, selectedCrewAction === "find" && styles.textSelected]}>I'm looking for a group</Text>
            </TouchableOpacity>

            {/* Optie 3: Zelf maken */}
            <TouchableOpacity style={[styles.crewCard, selectedCrewAction === "create" && styles.boxSelected]} onPress={() => setSelectedCrewAction(selectedCrewAction === "create" ? null : "create")}>
              <Text style={[styles.crewCardText, selectedCrewAction === "create" && styles.textSelected]}>I want to create my own Crew</Text>
            </TouchableOpacity>
          </View>
        );
      case 5:
        // Deze stap past zich aan op basis van wat je in stap 4 koos!
        return (
          <View style={styles.content}>
            {selectedCrewAction === "invite" && (
              <>
                <Text style={styles.stepTitle}>Enter your code</Text>
                <Text style={styles.bodyText}>Paste the invite code you received from your friend below.</Text>
                <TextInput style={styles.input} placeholder="e.g. MYPACE-1234" placeholderTextColor="#999999" autoCapitalize="characters" />
              </>
            )}

            {selectedCrewAction === "find" && (
              <>
                <Text style={styles.stepTitle}>Find a Crew</Text>
                <Text style={styles.bodyText}>Search for local running groups in your area.</Text>
                <TextInput style={styles.input} placeholder="Search city or group name..." placeholderTextColor="#999999" />
              </>
            )}

            {selectedCrewAction === "create" && (
              <>
                <Text style={styles.stepTitle}>Name your Crew</Text>
                <Text style={styles.bodyText}>Give your new running group an awesome name.</Text>
                <TextInput style={styles.input} placeholder="Crew Name" placeholderTextColor="#999999" />
              </>
            )}

            {/* Als ze op 'Skip' klikten in stap 4: */}
            {!selectedCrewAction && (
              <>
                <Text style={styles.stepTitle}>All set!</Text>
                <Text style={styles.bodyText}>You can always join or create a Crew later from your dashboard. Let's start running!</Text>
              </>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
        <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      </View>

      <View style={styles.dynamicContainer}>{renderStepContent()}</View>

      <View style={styles.buttonContainer}>{renderFooterButtons()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (container, topBar, backButton, dynamicContainer, content, stepTitle, bodyText, sectionLabel, input, buttonContainer, avatarContainer, avatarPlaceholder, plusBadge, uploadText blijven allemaal exact hetzelfde als je al had!) ...
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", width: "90%", marginTop: 10, marginBottom: 30 },
  backButton: { padding: 10, marginLeft: -10 },
  dynamicContainer: { flex: 1, width: "90%" },
  content: { width: "100%" },
  stepTitle: { fontSize: 28, fontFamily: "Baloo-Bold", color: COLORS.primaryOrange, marginBottom: 10 },
  bodyText: { fontSize: 16, fontFamily: "Inter", color: COLORS.textLight, lineHeight: 24, marginBottom: 20 },
  sectionLabel: { fontSize: 16, fontFamily: "Inter", fontWeight: "600", color: COLORS.textLight, marginTop: 15, marginBottom: 8 },
  input: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: 24, marginBottom: 15, width: "100%", backgroundColor: COLORS.textLight, color: COLORS.textDark, fontFamily: "Inter", fontSize: 16 },
  buttonContainer: { width: "90%", paddingBottom: 0, alignItems: "center" }, // alignItems center toegevoegd voor de skip knop
  avatarContainer: { alignItems: "center", marginTop: 40 },
  avatarPlaceholder: { width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.textLight, justifyContent: "center", alignItems: "center", position: "relative" },
  plusBadge: { position: "absolute", bottom: 5, right: 5, backgroundColor: COLORS.primaryOrange, width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: COLORS.background },
  uploadText: { marginTop: 16, fontFamily: "Inter", fontSize: 16, fontWeight: "600", color: COLORS.primaryOrange },

  // --- NIEUWE STIJLEN VOOR STAP 3, 4 EN DE SKIP KNOP ---
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  goalBox: {
    width: "30%", // Neemt net geen derde van de breedte in
    aspectRatio: 1, // Maakt er perfecte vierkantjes van
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent", // Onzichtbare rand, voorkomt dat hij "springt" bij selectie
  },
  goalNumber: {
    fontSize: 32,
    fontFamily: "Baloo-Bold",
    color: COLORS.textLight,
  },
  crewCard: {
    width: "100%",
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  crewCardText: {
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
    color: COLORS.textLight,
  },
  boxSelected: {
    borderColor: COLORS.secondaryYellow,
    backgroundColor: COLORS.selected,
  },

  footerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonSlot: {
    width: '100%',
    minHeight: 60, // De gemiddelde hoogte van een knop. Voorkomt dat het scherm inzakt als de knop weg is!
    justifyContent: 'center',
  },
  skipButtonSlot: {
    height: 40, // De ruimte die we reserveren voor de skip knop
    justifyContent: 'center',
    marginTop: 10, // Een beetje marge tussen Continue en Skip
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600",
    color: COLORS.secondaryYellow,
    textDecorationLine: "underline", // Onderstreept!
  },
});
