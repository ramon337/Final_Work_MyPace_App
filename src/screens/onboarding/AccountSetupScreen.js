// src/screens/onboarding/AccountSetupScreen.js
import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Image, FlatList, ActivityIndicator, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import CustomButton from "../../components/ui/CustomButton";
import ProgressBar from "../../components/ui/ProgressBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { recalculateFutureSchedule } from "../../services/streakService";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import LottieView from "lottie-react-native";

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

  const [publicCrews, setPublicCrews] = useState([]);
  const [filteredCrews, setFilteredCrews] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPublicCrewId, setSelectedPublicCrewId] = useState(null);
  const [loadingCrews, setLoadingCrews] = useState(false);
  
  // 🚀 State voor de waarschuwing popup
  const [showWarningModal, setShowWarningModal] = useState(false);
  // 🚀 BUDDY TYPEWRITER STATES (Alleen voor stap 4)
  const [displayedBuddyText, setDisplayedBuddyText] = useState("");
  const [isBuddyTextFullyTyped, setIsBuddyTextFullyTyped] = useState(true);
  const typewriterTimer = useRef(null);
  const exactTextRef = useRef("");
  const buddyAnimationRef = useRef(null);

  useEffect(() => {
    if (currentStep === 4) {
      const firstName = name ? name.split(" ")[0] : "there";
      const fullText = `Hi ${firstName}, enough about you now!\n\nIn MyPace it's all about teamwork and motivation. Let's join a crew so you can achieve goals together!`;

      setDisplayedBuddyText("");
      exactTextRef.current = "";
      setIsBuddyTextFullyTyped(false);
      
      if (typewriterTimer.current) clearInterval(typewriterTimer.current);

      const textArray = Array.from(fullText);
      let index = 0;

      typewriterTimer.current = setInterval(() => {
        if (index < textArray.length) {
          exactTextRef.current += textArray[index];
          setDisplayedBuddyText(exactTextRef.current);
          index++;
        } else {
          clearInterval(typewriterTimer.current);
          setIsBuddyTextFullyTyped(true);
        }
      }, 15);
    } else {
      setIsBuddyTextFullyTyped(true); // Voor alle andere stappen is de tekst "klaar"
    }

    return () => {
      if (typewriterTimer.current) clearInterval(typewriterTimer.current);
    };
  }, [currentStep, name]);

  const internalSteps = 6;
  const displayTotalSteps = 5;
  const displayStep = currentStep > 4 ? currentStep - 1 : currentStep;

  useEffect(() => {
    if (currentStep === 6 && selectedCrewAction === "find") {
      fetchPublicCrews();
    }
  }, [currentStep, selectedCrewAction]);

  const fetchPublicCrews = async () => {
    setLoadingCrews(true);
    try {
      const { data, error } = await supabase.from("crews").select("id, name, crew_members(user_id)").eq("is_public", true);

      if (error) throw error;

      if (data) {
        const available = data
          .filter((crew) => crew.crew_members.length < 5)
          .map((crew) => ({
            id: crew.id,
            name: crew.name,
            memberCount: crew.crew_members.length,
          }));
        setPublicCrews(available);
        setFilteredCrews(available);
      }
    } catch (error) {
      console.error("Fout bij ophalen openbare crews:", error.message);
    } finally {
      setLoadingCrews(false);
    }
  };

useEffect(() => {
    if (buddyAnimationRef.current && currentStep === 4) {
      buddyAnimationRef.current.play();
    }
  }, [currentStep]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCrews(publicCrews);
    } else {
      setFilteredCrews(publicCrews.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())));
    }
  }, [searchQuery, publicCrews]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

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
    if (currentStep === 4 && !isBuddyTextFullyTyped) return;

    if (currentStep < internalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      const success = await handleSignUp();
      if (success) {
        navigation.navigate("MainTabs");
      }
    }
  };

  const handleSkip = () => {
    if (currentStep === 2) setAvatarUri(null);
    if (currentStep === 3) setSelectedGoal(null);
    
    // 🚀 Als ze skippen bij de crew-fase (stap 5 of 6), toon de modal in plaats van direct doorgaan
    if (currentStep === 5 || currentStep === 6) {
      setShowWarningModal(true);
      return;
    }
    
    setCurrentStep(currentStep + 1);
  };

  const handleSignUp = async () => {
    setStepSixError("");

    const cleanCode = inviteCode.trim().toUpperCase();
    let verifiedCrewId = null;

    if (selectedCrewAction === "invite" && cleanCode !== "") {
      const { data: crewCheck } = await supabase.from("crews").select("id").eq("invite_code", cleanCode).maybeSingle();
      if (!crewCheck) {
        setStepSixError("We couldn't find a Crew with that code. Please check and try again.");
        return false;
      }
      verifiedCrewId = crewCheck.id;
    } else if (selectedCrewAction === "find") {
      verifiedCrewId = selectedPublicCrewId;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      console.error("Fout bij registreren:", authError.message);
      return false;
    }

    if (authData.user) {
      const userId = authData.user.id;
      let finalAvatarUrl = null;

      if (avatarUri) {
        try {
          const fileExt = avatarUri.split(".").pop() || "jpg";
          const fileName = `${userId}-${Date.now()}.${fileExt}`;
          const formData = new FormData();

          formData.append("files", {
            uri: avatarUri,
            name: fileName,
            type: `image/${fileExt}`,
          });

          const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, formData, {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
            finalAvatarUrl = publicUrlData.publicUrl;
          } else {
            console.error("Supabase Storage Error:", uploadError.message);
          }
        } catch (error) {
          console.error("Avatar upload faalde:", error);
        }
      }

      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: userId,
          display_name: name,
          weekly_goal: selectedGoal,
          avatar_url: finalAvatarUrl,
        },
      ]);

      if (profileError) return false;

      if (selectedCrewAction === "create" && crewName !== "") {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const randomCode = Array.from({ length: 6 })
          .map(() => chars[Math.floor(Math.random() * chars.length)])
          .join("");

        const { data: crewData } = await supabase
          .from("crews")
          .insert([{ name: crewName, invite_code: randomCode, is_public: false }])
          .select()
          .single();

        if (crewData) {
          await supabase.from("crew_members").insert([{ user_id: userId, crew_id: crewData.id }]);
        }
      } else if ((selectedCrewAction === "invite" || selectedCrewAction === "find") && verifiedCrewId !== null) {
        await supabase.from("crew_members").insert([{ user_id: userId, crew_id: verifiedCrewId }]);

        await supabase.from("crew_activity_log").insert({
          crew_id: verifiedCrewId,
          user_id: userId,
          event_type: "member_joined",
        });

        await recalculateFutureSchedule(verifiedCrewId);
      }

      return true;
    }
  };

  const renderFooterButtons = () => {
    let canFinishStep6 = false;
    if (currentStep === 6) {
      if (selectedCrewAction === "invite" && inviteCode.trim() !== "") canFinishStep6 = true;
      if (selectedCrewAction === "create" && crewName.trim() !== "") canFinishStep6 = true;
      if (selectedCrewAction === "find" && selectedPublicCrewId !== null) canFinishStep6 = true;
    }

    const showContinue =
    currentStep === 1 || 
    (currentStep === 2 && avatarUri !== null) || 
    (currentStep === 3 && selectedGoal !== null) || 
    (currentStep === 4 && isBuddyTextFullyTyped) || // 🚀 Knop blijft onzichtbaar tot hij klaar is!
    (currentStep === 5 && selectedCrewAction !== null) || 
    (currentStep === 6 && canFinishStep6);
    return (
      <View style={styles.footerWrapper}>
        <View style={styles.primaryButtonSlot}>{showContinue && <CustomButton title={currentStep === internalSteps ? "Finish Setup" : "Continue"} type="primary" onPress={handleNext} />}</View>
        <View style={styles.skipButtonSlot}>
          {/* 🚀 Skip for now knop beschikbaar gemaakt voor case 5 en 6 */}
          {(currentStep === 2 || currentStep === 3 || currentStep === 5 || currentStep === 6) && (
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
              <TouchableOpacity style={[styles.avatarPlaceholder, avatarUri && { backgroundColor: "transparent", borderColor: COLORS.mascotGreen, borderWidth: 2 }]} activeOpacity={0.8} onPress={pickImage}>
                {avatarUri ? (
                  <>
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                    <TouchableOpacity style={styles.removeAvatarBadge} onPress={() => setAvatarUri(null)} activeOpacity={0.8}>
                      <Ionicons name="trash" size={18} color="#FFF" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <Ionicons name="camera" size={48} color={COLORS.textDark} />
                )}
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
            <View style={styles.speechBubbleCardSetup}>
              <Text style={styles.bodyTextBubble}>
                {displayedBuddyText}
              </Text>
            </View>
            <View style={styles.imageSmallContainerSetup}>
              <LottieView
                ref={buddyAnimationRef}
                source={require("../../assets/animations/mascot-talking.json")} 
                autoPlay={false}
                loop={!isBuddyTextFullyTyped} // 🚀 Maakt zijn huidige beweging netjes af en stopt
                renderMode="SOFTWARE"
                style={styles.lottieSmallSetup}
              />
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
          <View style={[styles.content, { flex: 1 }]}>
            {selectedCrewAction === "invite" && (
              <>
                <Text style={styles.stepTitle}>Enter your code</Text>
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
              <View style={{ flex: 1, paddingBottom: 20 }}>
                <Text style={styles.stepTitle}>Find a Crew</Text>
                <Text style={styles.bodyText}>Search for local running groups in your area.</Text>
                <TextInput style={styles.input} placeholder="Search group name..." placeholderTextColor="#999999" value={searchQuery} onChangeText={setSearchQuery} />

                {loadingCrews ? (
                  <ActivityIndicator color={COLORS.primaryOrange} style={{ marginTop: 20 }} />
                ) : filteredCrews.length === 0 ? (
                  <Text style={[styles.bodyText, { textAlign: "center", marginTop: 20 }]}>No public crews found.</Text>
                ) : (
                  <View>
                  {filteredCrews.map((item) => (
                    <TouchableOpacity 
                      key={item.id}
                      style={[styles.crewCard, selectedPublicCrewId === item.id && styles.boxSelected]} 
                      onPress={() => setSelectedPublicCrewId(item.id)}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={[styles.crewCardText, selectedPublicCrewId === item.id && styles.textSelected]}>
                          {item.name}
                        </Text>
                        <Text style={{ color: COLORS.textMuted, fontFamily: "Inter" }}>
                          {item.memberCount}/5 Members
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                )}
              </View>
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
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textLight} />
        </TouchableOpacity>

        {currentStep !== 4 ? <ProgressBar currentStep={displayStep} totalSteps={displayTotalSteps} /> : <View style={{ flex: 1 }} />}
      </View>

      <KeyboardAvoidingView style={styles.dynamicContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.fixedButtonContainer}>{renderFooterButtons()}</View>

      {/* 🚀 DE VERKORTE WAARSCHUWINGSMODAL */}
      <Modal visible={showWarningModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="people-outline" size={60} color={COLORS.primaryOrange} style={{ marginBottom: 15 }} />
            
            <Text style={styles.modalBody}>
              In this app everything revolves around teamwork. To make good use of this app you will have to join a crew.
            </Text>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => setShowWarningModal(false)}>
                <Text style={styles.modalPrimaryButtonText}>Let's find a crew</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                      style={styles.modalSecondaryButton}
                      onPress={async () => {
                        setShowWarningModal(false);
                        
                        // 🚀 1. We maken het account EERST aan in Supabase (zonder crew)
                        const success = await handleSignUp();
                        
                        if (success) {
                          // 🚀 2. Als je app automatisch naar het hoofdscherm wisselt 
                          // bij een succesvolle login (Supabase auth state), is navigeren
                          // hier niet eens meer nodig!
                          try {
                            navigation.navigate("MainTabs"); // Werkt dit niet of geeft dit dezelfde fout? Haal deze regel dan simpelweg weg!
                          } catch (e) {
                            console.log("Navigatie afgehandeld door Auth State");
                          }
                        }
                      }}
                    >
                      <Text style={styles.modalSecondaryButtonText}>Skip anyway</Text>
                    </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    marginTop: 10,
    marginBottom: 10,
  },
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
  avatarImage: { width: 140, height: 140, borderRadius: 70 },
  plusBadge: { position: "absolute", bottom: 5, right: 5, backgroundColor: COLORS.primaryOrange, width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: COLORS.background },
  uploadText: { marginTop: 16, fontFamily: "Inter", fontSize: 16, fontWeight: "600", color: COLORS.primaryOrange },
  optionsRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 10 },
  goalBox: { width: "30%", aspectRatio: 1, backgroundColor: COLORS.cardBackground, borderRadius: 20, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  goalNumber: { fontSize: 32, fontFamily: "Baloo-Bold", color: COLORS.textLight },
  crewCard: { width: "100%", backgroundColor: COLORS.cardBackground, paddingVertical: 20, paddingHorizontal: 20, borderRadius: 20, marginBottom: 15, borderWidth: 2, borderColor: "transparent" },
  crewCardText: { fontSize: 16, fontFamily: "Inter", fontWeight: "600", color: COLORS.textLight },
  boxSelected: { borderColor: COLORS.secondaryYellow, backgroundColor: COLORS.selected },
  textSelected: { color: COLORS.secondaryYellow },
  footerWrapper: { width: "100%", alignItems: "center" },
  primaryButtonSlot: { width: "100%", minHeight: 60, justifyContent: "center" },
  skipButtonSlot: { height: 40, justifyContent: "center", marginTop: 10 },
  skipButton: { paddingVertical: 10, paddingHorizontal: 20 },
  skipText: { fontSize: 16, fontFamily: "Inter", fontWeight: "600", color: COLORS.secondaryYellow, textDecorationLine: "underline" },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 107, 107, 0.1)", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#FF6B6B", marginBottom: 15 },
  errorText: { color: "#FF6B6B", fontFamily: "Inter", marginLeft: 8, fontSize: 14 },
  removeAvatarBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#FF6B6B", width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: COLORS.background },
  
  // 🚀 NIEUWE STYLES VOOR CASE 4 (BUDDY)
  buddyScreenContainer: { flex: 1, justifyContent: "center", marginTop: 20 },
  speechBubbleCardSetup: { backgroundColor: COLORS.cardBackground, padding: 24, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', width: '100%', marginBottom: 20, minHeight: 180 },
  bodyTextBubble: { fontSize: 16, fontFamily: "Inter", color: COLORS.textLight, lineHeight: 24, textAlign: "left" },
  imageSmallContainerSetup: { width: "100%", alignItems: "flex-start", paddingLeft: 10 },
  lottieSmallSetup: { width: 230, height: 230, resizeMode: "contain" },
  
  fixedButtonContainer: {
    position: "absolute",
    bottom: 20,
    width: "90%",
    alignItems: "center",
    backgroundColor: COLORS.background, 
    paddingTop: 10,
  },

  // 🚀 MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.cardBackground, width: '85%', borderRadius: 24, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalBody: { fontSize: 16, fontFamily: 'Inter', color: COLORS.textLight, textAlign: 'center', lineHeight: 24, marginBottom: 25 },
  modalButtonContainer: { width: '100%' },
  modalPrimaryButton: { backgroundColor: COLORS.primaryOrange, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  modalPrimaryButtonText: { color: '#FFF', fontFamily: 'Inter', fontWeight: 'bold', fontSize: 16 },
  modalSecondaryButton: { paddingVertical: 12, alignItems: 'center' },
  modalSecondaryButtonText: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 14, fontWeight: '600' }
});