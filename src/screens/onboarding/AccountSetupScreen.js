// src/screens/onboarding/AccountSetupScreen.js
import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import CustomButton from "../../components/ui/CustomButton";
import ProgressBar from "../../components/ui/ProgressBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

export default function AccountSetupScreen({ navigation }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedCrewAction, setSelectedCrewAction] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stepOneError, setStepOneError] = useState("");
  const [stepSixError, setStepSixError] = useState("");
  const [crewName, setCrewName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [avatarUri, setAvatarUri] = useState(null);

  // DE MAGIE: We hebben intern 6 schermen, maar tonen er maar 5 aan de gebruiker
  const internalSteps = 6;
  const displayTotalSteps = 5;

  // We berekenen welk nummer de progressiebalk moet tonen
  // Als we NA het buddy scherm (stap 4) zijn, trekken we er 1 af voor de UI
  const displayStep = currentStep > 4 ? currentStep - 1 : currentStep;

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!name || !email || !password) {
        setStepOneError("Please fill in all fields.");
        return;
      }
      const emailRegex = /\S+@\S+\.\S+/;
      if (!emailRegex.test(email)) {
        setStepOneError("Please enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        setStepOneError("Password must be at least 6 characters long.");
        return;
      }
      setStepOneError("");
    }

    if (currentStep < internalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      console.log("Setup Compleet! Account opslaan in database...");
      const success = await handleSignUp();
      if (success) {
        navigation.navigate("MainTabs");
      } else {
        console.log("Er ging iets mis bij Supabase.");
      }
    }
  };

  const handleSkip = () => {
    if (currentStep === 2) setAvatarUri(null);
    if (currentStep === 3) setSelectedGoal(null);
    setCurrentStep(currentStep + 1);
  };

  const handleSignUp = async () => {
    console.log("Bezig met account aanmaken...");
    setStepSixError(""); // Reset eventuele oude foutmeldingen

    const cleanCode = inviteCode.trim().toUpperCase();
    let verifiedCrewId = null;

    // --- 1. VOORAF CHECKEN (De Invite Code) ---
    if (selectedCrewAction === "invite" && cleanCode !== "") {
      console.log("Controleren of invite code bestaat:", cleanCode);

      const { data: crewCheck } = await supabase.from("crews").select("id").eq("invite_code", cleanCode).maybeSingle(); // maybeSingle voorkomt een harde crash als er 0 resultaten zijn

      if (!crewCheck) {
        setStepSixError("We couldn't find a Crew with that code. Please check and try again.");
        return false; // Stop de hele boel! Er is nog géén account aangemaakt.
      }
      verifiedCrewId = crewCheck.id; // Bewaar het ID voor straks
    }

    // --- 2. MAAK HET ACCOUNT AAN ---
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      console.error("Fout bij registreren:", authError.message);
      return false;
    }

    if (authData.user) {
      const userId = authData.user.id;

      // --- 3. MAAK HET PROFIEL ---
      const { error: profileError } = await supabase.from("profiles").insert([{ id: userId, display_name: name, weekly_goal: selectedGoal }]);
      if (profileError) return false;

      // --- 4. KOPPEL DE CREW EN MAAK QUEST AAN ---
      if (selectedCrewAction === "create" && crewName !== "") {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const randomCode = Array.from({ length: 6 })
          .map(() => chars[Math.floor(Math.random() * chars.length)])
          .join("");

        const { data: crewData } = await supabase
          .from("crews")
          .insert([{ name: crewName, invite_code: randomCode }])
          .select()
          .single();

        if (crewData) {
          // 1. Maak de gebruiker lid van de nieuwe crew
          await supabase.from("crew_members").insert([{ user_id: userId, crew_id: crewData.id }]);

          // 2. 🚀 NIEUW: Koppel direct de eerste gezamenlijke Quest aan de Crew!
          await supabase.from("crew_quests").insert([
            {
              crew_id: crewData.id,
              title: "Route 66 Challenge",
              subtitle: "Run the legendary highway across the US!",
              target_amount: 3940, // Bijvoorbeeld 3940 minuten
              current_progress: 0,
              type: "minutes",
            },
          ]);

          console.log("Crew gemaakt, lid geworden en Quest gekoppeld!");
        }
      } else if (selectedCrewAction === "invite" && verifiedCrewId !== null) {
        // We gebruiken hier het verifiedCrewId dat we in stap 1 al hadden gevonden!
        await supabase.from("crew_members").insert([{ user_id: userId, crew_id: verifiedCrewId }]);
        await supabase.from("crew_activity_log").insert({
          crew_id: verifiedCrewId,
          user_id: userId,
          event_type: "member_joined",
        });
        console.log("Succesvol aangesloten bij crew via code!");
      }

      return true; // Alles is 100% gelukt!
    }
  };

  const renderFooterButtons = () => {
    const showContinue = currentStep === 1 || (currentStep === 2 && avatarUri !== null) || (currentStep === 3 && selectedGoal !== null) || currentStep === 4 || (currentStep === 5 && selectedCrewAction !== null) || currentStep === 6;

    return (
      <View style={styles.footerWrapper}>
        <View style={styles.primaryButtonSlot}>{showContinue && <CustomButton title={currentStep === internalSteps ? "Finish Setup" : "Continue"} type="primary" onPress={handleNext} />}</View>

        <View style={styles.skipButtonSlot}>
          {(currentStep === 2 || currentStep === 3) && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderStepContent = () => {
    const firstName = name ? name.split(" ")[0] : "there";

    switch (currentStep) {
      case 1:
        return (
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Registration</Text>
            {stepOneError !== "" && (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={20} color="#FF6B6B" />
                <Text style={styles.errorText}>{stepOneError}</Text>
              </View>
            )}
            <Text style={styles.sectionLabel}>What's your name?</Text>
            <TextInput style={styles.input} placeholder="Enter your name" placeholderTextColor="#999999" value={name} onChangeText={setName} />
            <Text style={styles.sectionLabel}>What's your email?</Text>
            <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor="#999999" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <Text style={styles.sectionLabel}>Choose your password</Text>
            <TextInput style={styles.input} placeholder="Enter your password" placeholderTextColor="#999999" secureTextEntry={true} value={password} onChangeText={setPassword} />
          </View>
        );
      case 2:
        return (
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Pick a profile picture</Text>
            <Text style={styles.bodyText}>Show your crew who they are running with! You can always change this later.</Text>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                style={[styles.avatarPlaceholder, avatarUri && { backgroundColor: "rgba(92, 190, 136, 0.2)", borderColor: COLORS.mascotGreen, borderWidth: 2 }]}
                activeOpacity={0.8}
                onPress={() => setAvatarUri(avatarUri ? null : "simulated_image_url")}
              >
                {avatarUri ? <Ionicons name="checkmark" size={48} color={COLORS.mascotGreen} /> : <Ionicons name="camera" size={48} color={COLORS.textDark} />}
                {!avatarUri && (
                  <View style={styles.plusBadge}>
                    <Ionicons name="add" size={20} color={COLORS.background} />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.uploadText}>{avatarUri ? "Looking good!" : "Tap to upload"}</Text>
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
                <TouchableOpacity key={num} style={[styles.goalBox, selectedGoal === num && styles.boxSelected]} onPress={() => setSelectedGoal(selectedGoal === num ? null : num)} activeOpacity={0.7}>
                  <Text style={[styles.goalNumber, selectedGoal === num && styles.textSelected]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 4:
        return (
          <View style={[styles.content, styles.buddyScreenContainer]}>
            <View style={styles.speechBubbleLarge}>
              <Text style={styles.speechTextLarge}>
                Hi <Text style={{ color: COLORS.primaryOrange, fontFamily: "Baloo-Bold", fontSize: 20 }}>{firstName}</Text>, enough about you now!
                {"\n\n"}
                In MyPace it's all about motivation. Let's join a crew so you can achieve goals together.
              </Text>
            </View>
            <View style={styles.largeBuddyContainer}>
              <Image source={require("../../assets/images/mascot.png")} style={{ height: 260, width: 250, marginTop: 100 }} />
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Stronger Together!</Text>
            <Text style={styles.bodyText}>Running is more fun with friends. What's your plan?</Text>
            <TouchableOpacity style={[styles.crewCard, selectedCrewAction === "invite" && styles.boxSelected]} onPress={() => setSelectedCrewAction(selectedCrewAction === "invite" ? null : "invite")}>
              <Text style={[styles.crewCardText, selectedCrewAction === "invite" && styles.textSelected]}>I have an invite code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.crewCard, selectedCrewAction === "find" && styles.boxSelected]} onPress={() => setSelectedCrewAction(selectedCrewAction === "find" ? null : "find")}>
              <Text style={[styles.crewCardText, selectedCrewAction === "find" && styles.textSelected]}>I'm looking for a group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.crewCard, selectedCrewAction === "create" && styles.boxSelected]} onPress={() => setSelectedCrewAction(selectedCrewAction === "create" ? null : "create")}>
              <Text style={[styles.crewCardText, selectedCrewAction === "create" && styles.textSelected]}>I want to create my own Crew</Text>
            </TouchableOpacity>
          </View>
        );
      case 6:
        return (
          <View style={styles.content}>
            {selectedCrewAction === "invite" && (
              <>
                <Text style={styles.stepTitle}>Enter your code</Text>

                {/* NIEUW: De rode foutmelding als de code niet klopt */}
                {stepSixError !== "" && (
                  <View style={styles.errorBox}>
                    <Ionicons name="warning-outline" size={20} color="#FF6B6B" />
                    <Text style={styles.errorText}>{stepSixError}</Text>
                  </View>
                )}

                <Text style={styles.bodyText}>Paste the invite code you received from your friend below.</Text>
                <TextInput style={styles.input} placeholder="e.g. MYPACE-1234" placeholderTextColor="#999999" autoCapitalize="characters" value={inviteCode} onChangeText={setInviteCode} />
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
                <TextInput style={styles.input} placeholder="Crew Name" placeholderTextColor="#999999" value={crewName} onChangeText={setCrewName} />
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
      {/* DE CINEMATIC BREAK: Verberg de topbar op stap 4 */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textLight} />
        </TouchableOpacity>

        {currentStep !== 4 ? (
          <ProgressBar currentStep={displayStep} totalSteps={displayTotalSteps} />
        ) : (
          /* Een lege View die de ruimte van de ProgressBar inneemt zodat de back-button links blijft staan */
          <View style={{ flex: 1 }} />
        )}
      </View>

      <View style={styles.dynamicContainer}>{renderStepContent()}</View>

      <View style={styles.buttonContainer}>{renderFooterButtons()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", width: "90%", marginTop: 10, marginBottom: 30 },
  backButton: { padding: 10, marginLeft: -10 },
  dynamicContainer: { flex: 1, width: "90%" },
  content: { width: "100%" },
  stepTitle: { fontSize: 28, fontFamily: "Baloo-Bold", color: COLORS.primaryOrange, marginBottom: 10 },
  bodyText: { fontSize: 16, fontFamily: "Inter", color: COLORS.textLight, lineHeight: 24, marginBottom: 20 },
  sectionLabel: { fontSize: 16, fontFamily: "Inter", fontWeight: "600", color: COLORS.textLight, marginTop: 15, marginBottom: 8 },
  input: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: 24, marginBottom: 15, width: "100%", backgroundColor: COLORS.textLight, color: COLORS.textDark, fontFamily: "Inter", fontSize: 16 },
  buttonContainer: { width: "90%", paddingBottom: 0, alignItems: "center" },
  avatarContainer: { alignItems: "center", marginTop: 40 },
  avatarPlaceholder: { width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.textLight, justifyContent: "center", alignItems: "center", position: "relative" },
  plusBadge: { position: "absolute", bottom: 5, right: 5, backgroundColor: COLORS.primaryOrange, width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: COLORS.background },
  uploadText: { marginTop: 16, fontFamily: "Inter", fontSize: 16, fontWeight: "600", color: COLORS.primaryOrange },
  optionsRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 10 },
  goalBox: { width: "30%", aspectRatio: 1, backgroundColor: COLORS.cardBackground, borderRadius: 20, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  goalNumber: { fontSize: 32, fontFamily: "Baloo-Bold", color: COLORS.textLight },
  crewCard: { width: "100%", backgroundColor: COLORS.cardBackground, paddingVertical: 20, paddingHorizontal: 20, borderRadius: 20, marginBottom: 15, borderWidth: 2, borderColor: "transparent" },
  crewCardText: { fontSize: 16, fontFamily: "Inter", fontWeight: "600", color: COLORS.textLight },
  boxSelected: { borderColor: COLORS.secondaryYellow, backgroundColor: COLORS.selected },
  footerWrapper: { width: "100%", alignItems: "center" },
  primaryButtonSlot: { width: "100%", minHeight: 60, justifyContent: "center" },
  skipButtonSlot: { height: 40, justifyContent: "center", marginTop: 10 },
  skipButton: { paddingVertical: 10, paddingHorizontal: 20 },
  skipText: { fontSize: 16, fontFamily: "Inter", fontWeight: "600", color: COLORS.secondaryYellow, textDecorationLine: "underline" },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 107, 107, 0.1)", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#FF6B6B", marginBottom: 15 },
  errorText: { color: "#FF6B6B", fontFamily: "Inter", marginLeft: 8, fontSize: 14 },
  buddyScreenContainer: { alignItems: "center", justifyContent: "center", flex: 1, marginTop: -100 },
  speechBubbleLarge: {
    backgroundColor: COLORS.cardBackground,
    padding: 25,
    borderRadius: 24,
    borderBottomRightRadius: 4,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  speechTextLarge: { color: COLORS.textLight, fontFamily: "Inter", fontSize: 18, lineHeight: 28, textAlign: "center" },
  largeBuddyContainer: { width: 200, height: 200, justifyContent: "center", alignItems: "center" },
});
