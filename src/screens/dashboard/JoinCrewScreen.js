// src/screens/dashboard/JoinCrewScreen.js
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import CustomButton from "../../components/ui/CustomButton";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { recalculateFutureSchedule } from "../../services/streakService";
import { useUser } from "../../context/UserContext";

export default function JoinCrewScreen({ navigation }) {
  const { refreshCrewData } = useUser();
  const [step, setStep] = useState(1);
  const [selectedCrewAction, setSelectedCrewAction] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [inviteCode, setInviteCode] = useState("");
  const [crewName, setCrewName] = useState("");
  
  // Find Crew states
  const [publicCrews, setPublicCrews] = useState([]);
  const [filteredCrews, setFilteredCrews] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPublicCrewId, setSelectedPublicCrewId] = useState(null);
  const [loadingCrews, setLoadingCrews] = useState(false);

  // Haal openbare crews op als men 'find' kiest
  useEffect(() => {
    if (step === 2 && selectedCrewAction === "find") {
      fetchPublicCrews();
    }
  }, [step, selectedCrewAction]);

  const fetchPublicCrews = async () => {
    setLoadingCrews(true);
    try {
      const { data, error } = await supabase
        .from("crews")
        .select("id, name, crew_members(user_id)")
        .eq("is_public", true);

      if (error) throw error;

      if (data) {
        const available = data
          .filter(crew => crew.crew_members.length < 5)
          .map(crew => ({
            id: crew.id,
            name: crew.name,
            memberCount: crew.crew_members.length
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
    if (searchQuery.trim() === "") {
      setFilteredCrews(publicCrews);
    } else {
      setFilteredCrews(
        publicCrews.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
  }, [searchQuery, publicCrews]);

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setErrorMessage("");
    } else {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedCrewAction) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found.");
      
      const userId = user.id;
      let targetCrewId = null;

      // --- OPTIE 1: INVITE CODE ---
      if (selectedCrewAction === "invite") {
        const cleanCode = inviteCode.trim().toUpperCase();
        if (!cleanCode) throw new Error("Please enter an invite code.");

        const { data: crewCheck } = await supabase.from("crews").select("id").eq("invite_code", cleanCode).maybeSingle();
        if (!crewCheck) throw new Error("Invalid invite code. Please check and try again.");
        targetCrewId = crewCheck.id;
      } 
      // --- OPTIE 2: FIND A GROUP ---
      else if (selectedCrewAction === "find") {
        if (!selectedPublicCrewId) throw new Error("Please select a crew from the list.");
        targetCrewId = selectedPublicCrewId;
      } 
      // --- OPTIE 3: CREATE A CREW ---
      else if (selectedCrewAction === "create") {
        if (!crewName.trim()) throw new Error("Please enter a name for your crew.");
        
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const randomCode = Array.from({ length: 6 }).map(() => chars[Math.floor(Math.random() * chars.length)]).join("");

        const { data: newCrew, error: createError } = await supabase
          .from("crews")
          .insert([{ name: crewName.trim(), invite_code: randomCode, is_public: false }])
          .select()
          .single();

        if (createError) throw createError;
        targetCrewId = newCrew.id;
      }

      // Koppel de gebruiker aan de gevonden/gemaakte crew
      const { error: joinError } = await supabase.from("crew_members").insert([{ user_id: userId, crew_id: targetCrewId }]);
      
      if (joinError) {
        // Als de gebruiker toevallig al in een crew zit
        if (joinError.code === '23505') throw new Error("You are already part of a crew.");
        throw joinError;
      }

      // Log activiteit in feed (alleen als het een bestaande crew was waar je in joint)
      if (selectedCrewAction !== "create") {
        await supabase.from("crew_activity_log").insert({
          crew_id: targetCrewId,
          user_id: userId,
          event_type: "member_joined",
        });
        
        // Herbereken het schema omdat er een nieuw lid is
        await recalculateFutureSchedule(targetCrewId);
      }

      // 🚀 SUCCES! Haal verse data op via context en sluit het scherm af
      refreshCrewData();
      navigation.goBack(); 

    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepOne = () => (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>Stronger Together!</Text>
      <Text style={styles.bodyText}>Running is more fun with friends. What's your plan?</Text>
      
      <TouchableOpacity style={[styles.crewCard, selectedCrewAction === "invite" && styles.boxSelected]} onPress={() => setSelectedCrewAction("invite")}>
        <Text style={[styles.crewCardText, selectedCrewAction === "invite" && styles.textSelected]}>I have an invite code</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.crewCard, selectedCrewAction === "find" && styles.boxSelected]} onPress={() => setSelectedCrewAction("find")}>
        <Text style={[styles.crewCardText, selectedCrewAction === "find" && styles.textSelected]}>I'm looking for a group</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.crewCard, selectedCrewAction === "create" && styles.boxSelected]} onPress={() => setSelectedCrewAction("create")}>
        <Text style={[styles.crewCardText, selectedCrewAction === "create" && styles.textSelected]}>I want to create my own Crew</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStepTwo = () => (
    <View style={[styles.content, { flex: 1 }]}>
      {errorMessage !== "" && (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={20} color="#FF6B6B" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {selectedCrewAction === "invite" && (
        <>
          <Text style={styles.stepTitle}>Enter your code</Text>
          <Text style={styles.bodyText}>Paste the invite code you received from your friend below.</Text>
          <TextInput style={styles.input} placeholder="e.g. MYPACE-1234" placeholderTextColor="#999999" autoCapitalize="characters" value={inviteCode} onChangeText={setInviteCode} />
        </>
      )}
      
      {selectedCrewAction === "find" && (
        <View style={{ flex: 1, paddingBottom: 20 }}>
          <Text style={styles.stepTitle}>Find a Crew</Text>
          <Text style={styles.bodyText}>Search for local running groups in your area.</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Search group name..." 
            placeholderTextColor="#999999" 
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
          {loadingCrews ? (
            <ActivityIndicator color={COLORS.primaryOrange} style={{ marginTop: 20 }} />
          ) : filteredCrews.length === 0 ? (
            <Text style={[styles.bodyText, { textAlign: 'center', marginTop: 20 }]}>No public crews found.</Text>
          ) : (
            <View>
            {filteredCrews.map((item) => (
              <TouchableOpacity 
                key={item.id}
                style={[styles.crewCard, selectedPublicCrewId === item.id && styles.boxSelected]} 
                onPress={() => setSelectedPublicCrewId(item.id)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.crewCardText, selectedPublicCrewId === item.id && styles.textSelected]}>
                    {item.name}
                  </Text>
                  <Text style={{ color: COLORS.textMuted, fontFamily: 'Inter' }}>
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

  const canProceed = () => {
    if (step === 1 && selectedCrewAction !== null) return true;
    if (step === 2) {
      if (selectedCrewAction === "invite" && inviteCode.trim() !== "") return true;
      if (selectedCrewAction === "create" && crewName.trim() !== "") return true;
      if (selectedCrewAction === "find" && selectedPublicCrewId !== null) return true;
    }
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.dynamicContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 130 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 1 ? renderStepOne() : renderStepTwo()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.fixedButtonContainer}>
        <View style={styles.primaryButtonSlot}>
          {canProceed() && (
            <CustomButton 
              title={isProcessing ? "Processing..." : step === 1 ? "Continue" : "Confirm"} 
              type="primary" 
              onPress={step === 1 ? handleNext : handleSubmit} 
              disabled={isProcessing}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", width: "90%", marginTop: 10, marginBottom: 10 },
  backButton: { padding: 10, marginLeft: -10 },
  dynamicContainer: { flex: 1, width: "90%" },
  content: { width: "100%" },
  stepTitle: { fontSize: 28, fontFamily: "Baloo-Bold", color: COLORS.primaryOrange, marginBottom: 10 },
  bodyText: { fontSize: 16, fontFamily: "Inter", color: COLORS.textLight, lineHeight: 24, marginBottom: 20 },
  input: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: 24, marginBottom: 15, width: "100%", backgroundColor: COLORS.textLight, color: COLORS.textDark, fontFamily: "Inter", fontSize: 16 },
  crewCard: { width: "100%", backgroundColor: COLORS.cardBackground, paddingVertical: 20, paddingHorizontal: 20, borderRadius: 20, marginBottom: 15, borderWidth: 2, borderColor: "transparent" },
  crewCardText: { fontSize: 16, fontFamily: "Inter", fontWeight: "600", color: COLORS.textLight },
  boxSelected: { borderColor: COLORS.secondaryYellow, backgroundColor: COLORS.selected },
  textSelected: { color: COLORS.secondaryYellow },
  fixedButtonContainer: { position: 'absolute', bottom: 20, width: "90%", alignItems: "center", backgroundColor: COLORS.background, paddingTop: 10 },
  primaryButtonSlot: { width: "100%", minHeight: 60, justifyContent: "center" },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 107, 107, 0.1)", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#FF6B6B", marginBottom: 15 },
  errorText: { color: "#FF6B6B", fontFamily: "Inter", marginLeft: 8, fontSize: 14, flex: 1 },
});