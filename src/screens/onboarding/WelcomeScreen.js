import React from "react";
import { StyleSheet, Text, View, Image, SafeAreaView } from "react-native";
import { COLORS } from "../../theme/colors";
import CustomButton from "../../components/ui/CustomButton";

export default function WelcomeScreen({ navigation }) {
  return (
    // SafeAreaView zorgt dat de app niet onder de 'notch' van je iPhone of Android verdwijnt
    <SafeAreaView style={styles.container}>
      {/* Top sectie met teksten */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>MyPace</Text>
      </View>
      <View style={styles.buttonContainer}>
        <Text style={styles.sectionLabel}>Already have an account?</Text>
        <CustomButton title="Log In" type="secondary" onPress={() => console.log("Naar login!")} />
        <View style={{ height: 30 }} />
        <Text style={styles.sectionLabel}>New to MyPace?</Text>
        <CustomButton title="Get Started" type="primary" onPress={() => navigation.navigate("MeetBuddy")} />
      </View>
    </SafeAreaView>
  );
}

// Hieronder staan de stijlen. Alle knop-stijlen zijn nu netjes verhuisd naar CustomButton.js!
const styles = StyleSheet.create({
  container: {
    flex: 1, // Neemt het hele scherm in beslag
    backgroundColor: COLORS.background,
    justifyContent: "space-between", // Verdeelt de 3 elementen netjes over de hoogte
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  title: {
    fontSize: 48,
    fontFamily: "Baloo-Bold", // Jouw custom font
    color: COLORS.primaryOrange, // Jouw gefixte oranje kleur
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "600", // Maakt de tekst net wat dikker (semi-bold)
    textAlign: "center",
    color: COLORS.textDark,
    marginTop: 24, // Iets meer ademruimte aan de bovenkant
    marginBottom: 12, // Dichter op de knop eronder, zodat ze visueel een groepje vormen
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  mascotImage: {
    width: 250,
    height: 250,
  },
  buttonContainer: {
    width: "90%",
    paddingBottom: 220,
  },
});
