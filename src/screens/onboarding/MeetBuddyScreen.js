// src/screens/onboarding/MeetBuddyScreen.js
import React from "react";
import { StyleSheet, Text, View, Image, SafeAreaView, TouchableOpacity } from "react-native";
import { COLORS } from "../../theme/colors";
import CustomButton from "../../components/ui/CustomButton";
import { Ionicons } from "@expo/vector-icons";
import ProgressBar from "../../components/ui/ProgressBar";

export default function MeetBuddyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Terugknop (Absolute gepositioneerd linksboven) */}

      {/* Top sectie */}

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textDark} />
        </TouchableOpacity>

        {/* ProgressBar neemt door flex: 1 automatisch de rest van de ruimte in */}
        <ProgressBar currentStep={4} totalSteps={4} />
      </View>
      <View style={styles.headerContainer}>
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

  progressBar: {
    position: "absolute",
  },
  topBar: {
    flexDirection: 'row', // Dit zet de knop en balk strak naast elkaar
    alignItems: 'center', // Dit centreert ze verticaal ten opzichte van elkaar
    width: '90%',
    marginTop: 10,
  },
  headerContainer: {
    alignItems: "center",
    width: "90%",
    marginTop: 30, // Geeft wat ruimte tussen de topbar en de titel
  },
  title: {
    fontSize: 32, 
    fontFamily: "Baloo-Bold",
    color: COLORS.primaryOrange,
    textAlign: "center",
    marginBottom: 15,
    // marginTop: 80, <--- DEZE REGEL MAG JE VERWIJDEREN!
    lineHeight: 40,
  },
  backButton: {
    padding: 10, 
    marginLeft: -10, // Trekt de knop iets naar links zodat hij optisch lijnt met je tekst
    // LET OP: alle absolute, top, left en zIndex regels zijn hier verwijderd!
  },
});
