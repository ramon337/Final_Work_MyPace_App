// src/screens/onboarding/MeetBuddyScreen.js
import React from "react";
import { StyleSheet, Text, View, Image, SafeAreaView, TouchableOpacity } from "react-native";
import { COLORS } from "../../theme/colors";
import CustomButton from "../../components/ui/CustomButton";
import { Ionicons } from "@expo/vector-icons";

export default function MeetBuddyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Terugknop (Absolute gepositioneerd linksboven) */}
      

      {/* Top sectie */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()} // Dit commando brengt je altijd naar het vorige scherm
      >
        <Ionicons name="arrow-back" size={28} color={COLORS.textDark} />
      </TouchableOpacity>
        <Text style={styles.title}>Meet your new running partner!</Text>
        <Text style={styles.body}>Your Buddy is here to cheer you on, celebrate your consistency, and keep things fun. No judgment, no speed limits, just good vibes.</Text>
      </View>

      {/* Midden sectie (De Mascotte) */}
      <View style={styles.imageContainer}>
        <Image source={require("../../assets/images/mascot.png")} style={styles.mascotImage} resizeMode="contain" />
      </View>

      {/* Onderste sectie */}
      <View style={styles.buttonContainer}>
        <CustomButton title="Continue" type="primary" onPress={() => console.log("Naar volgende scherm!")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: "center",
    width: "90%",
  },
  title: {
    fontSize: 32, // Iets kleiner dan 'MyPace' op het vorige scherm
    fontFamily: "Baloo-Bold",
    color: COLORS.primaryOrange,
    textAlign: "center",
    marginBottom: 15,
    marginTop: 80,
    lineHeight: 40,
  },
  body: {
    fontSize: 16,
    fontFamily: "Inter",
    textAlign: "center",
    color: COLORS.textDark,
    lineHeight: 24,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  mascotImage: {
    width: 280, // Iets groter om de buddy echt de ster te maken!
    height: 280,
  },
  buttonContainer: {
    width: "90%",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 0,
    zIndex: 10, // Zorgt dat de knop áltijd bovenop ligt en klikbaar is
    padding: 10, // Maakt het klikbare gebied voor je vinger wat groter
  },
});
