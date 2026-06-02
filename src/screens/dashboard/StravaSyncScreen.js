// src/screens/main/StravaSyncScreen.js
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { checkAndProgressStreak } from "../../services/streakService";
import { useNavigation } from '@react-navigation/native';

// 🚀 MASTER CHALLENGES TOEGEVOEGD: Zodat de sync altijd de volgende quest kan aanmaken!
const MASTER_CHALLENGES = [
  { title: "The Marathon", subtitle: "Run for 42 minutes to conquer the classic distance", target_amount: 42 },
  { title: "Centurion", subtitle: "Log 100 minutes of running as a crew", target_amount: 100 },
  { title: "London to Paris", subtitle: "Run 342 minutes to virtually cross the channel", target_amount: 342 },
  { title: "Camino de Santiago", subtitle: "Conquer the famous route in 790 minutes", target_amount: 790 },
  { title: "Route 66", subtitle: "The ultimate 3,940 minutes roadtrip", target_amount: 3940 },
  { title: "Great Wall of China", subtitle: "An epic 21,196 minutes expedition", target_amount: 21196 },
  { title: "Around the World", subtitle: "The ultimate boss: 40,075 minutes", target_amount: 40075 },
];

export default function StravaSyncScreen({ route }) {
  const navigation = useNavigation();
  const { runs = [] } = route.params || {};
  const [selectedRunId, setSelectedRunId] = useState(null);

  const [syncedIds, setSyncedIds] = useState([]);
  const [isCheckingDb, setIsCheckingDb] = useState(true);

  useEffect(() => {
    const fetchSyncedIds = async () => {
      const { data } = await supabase.from("runs").select("strava_activity_id");
      if (data) setSyncedIds(data.map((r) => r.strava_activity_id));
      setIsCheckingDb(false);
    };
    fetchSyncedIds();
  }, []);

  const availableRuns = runs.filter((run) => !syncedIds.includes(run.id));

  const handleSync = async () => {
    const runToSync = availableRuns.find((r) => r.id === selectedRunId);
    if (!runToSync) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Je bent niet ingelogd!");

      const { data: crewMember, error: crewError } = await supabase.from("crew_members").select("crew_id").eq("user_id", user.id).single();
      if (crewError || !crewMember) throw new Error("Je zit nog niet in een Crew!");

      const distanceKm = (runToSync.distance / 1000).toFixed(2);
      const timeMins = Math.round(runToSync.moving_time / 60);

      // 1. Run opslaan
      const { error: runInsertError } = await supabase.from("runs").insert({
        user_id: user.id,
        crew_id: crewMember.crew_id,
        strava_activity_id: runToSync.id,
        distance_km: parseFloat(distanceKm),
        duration_minutes: timeMins,
        run_date: runToSync.start_date,
      });
      if (runInsertError) throw runInsertError;

      // 2. Minuten updaten
      const { data: crew } = await supabase.from("crews").select("total_minutes").eq("id", crewMember.crew_id).single();
      await supabase.from("crews").update({ total_minutes: (crew.total_minutes || 0) + timeMins }).eq("id", crewMember.crew_id);

      // 3. Quest Logica (Nu waterdicht!)
      let questCompleted = false;
      let questTitle = "";
      let questOldProgress = 0;
      let questTarget = 0;

      try {
        const { data: currentQuestData } = await supabase
          .from("crew_quests")
          .select("id, title, target_amount, current_progress")
          .eq("crew_id", crewMember.crew_id)
          .eq("type", "minutes")
          .order("created_at", { ascending: false });

        let currentQuest = currentQuestData?.find(q => q.current_progress < q.target_amount);

        // 🚀 FIX: Als er géén actieve quest is (alles behaald of nieuwe crew), maak de VOLGENDE aan!
        if (!currentQuest) {
          const existingTargets = currentQuestData ? currentQuestData.map(q => q.target_amount) : [];
          const nextTemplate = MASTER_CHALLENGES.find(q => !existingTargets.includes(q.target_amount)) || MASTER_CHALLENGES[0];

          const { data: newQuestData, error: insertQuestError } = await supabase
            .from('crew_quests')
            .insert({
              crew_id: crewMember.crew_id,
              title: nextTemplate.title,
              subtitle: nextTemplate.subtitle,
              target_amount: nextTemplate.target_amount,
              current_progress: 0,
              type: 'minutes'
            })
            .select()
            .single();

          if (insertQuestError) throw insertQuestError;
          currentQuest = newQuestData;
        }

        // C. Tel de minuten bij de quest
        if (currentQuest) {
          questOldProgress = currentQuest.current_progress || 0;
          const questNewProgress = questOldProgress + timeMins;
          questTarget = currentQuest.target_amount;
          questTitle = currentQuest.title;

          if (questNewProgress >= questTarget) {
            questCompleted = true;
            // Beloning (Rest Day Token)
            const { data: crewData } = await supabase.from("crews").select("rest_day_tokens").eq("id", crewMember.crew_id).single();
            if (crewData) {
              await supabase.from("crews").update({ rest_day_tokens: Math.min(crewData.rest_day_tokens + 1, 5) }).eq("id", crewMember.crew_id);
            }
          }
          await supabase.from("crew_quests").update({ current_progress: questNewProgress }).eq("id", currentQuest.id);
        }
      } catch (err) {
        console.error("Fout in Quest Initialisatie in StravaSync:", err);
      }

      // 4. Logboek update
      await supabase.from("crew_activity_log").insert({
        crew_id: crewMember.crew_id,
        user_id: user.id,
        event_type: "run_uploaded",
        metadata: { run_name: runToSync.name, distance_km: parseFloat(distanceKm), duration_minutes: timeMins },
      });

      // 🚀 5. CHECK VOOR DE FIRST RUN BADGE
      const { count } = await supabase
        .from("crew_activity_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("event_type", "run_uploaded");

      const isFirstRun = count === 1;

      // 6. Streak Engine
      const streakResult = await checkAndProgressStreak(crewMember.crew_id, user.id);

      // 7. NAVIGEER NAAR HET NIEUWE ANIMATIESCHERM MET ALLE DATA
      const animationData = {
        streakStatus: streakResult.status,
        newStreak: streakResult.newStreak,
        timeMins: timeMins,
        questCompleted: questCompleted,
        questTitle: questTitle,
        questProgress: questOldProgress, 
        questTarget: questTarget,
        badgeUnlocked: isFirstRun ? 'first_run' : null // 🚀 HIER ZIT DE TRIGGER VOOR JE MEDAILLE!
      };

      navigation.navigate("AnimationScreen", { animationData });

    } catch (error) {
      console.error("Fout bij syncen:", error.message);
      Alert.alert("Oeps!", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Run</Text>
        <View style={{ width: 28 }} />
      </View>

      {isCheckingDb ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
          <Text style={[styles.emptySubtext, { marginTop: 20 }]}>Checking previous uploads...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {availableRuns.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={60} color={COLORS.secondaryYellow} />
              <Text style={styles.emptyText}>You're all caught up!</Text>
              <Text style={styles.emptySubtext}>No new runs found in the last 7 days.</Text>
            </View>
          ) : (
            availableRuns.map((run) => {
              const isSelected = selectedRunId === run.id;
              const distanceKm = (run.distance / 1000).toFixed(2);
              const timeMins = Math.round(run.moving_time / 60);
              const runDate = new Date(run.start_date_local).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

              return (
                <TouchableOpacity key={run.id} activeOpacity={0.9} onPress={() => setSelectedRunId(run.id)} style={[styles.runCard, isSelected ? styles.runCardSelected : null]}>
                  {isSelected && (
                    <View style={styles.checkmarkBadge}>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                  )}
                  <View style={styles.runInfo}>
                    <Text style={styles.runDate}>{runDate} • {run.type}</Text>
                    <Text style={styles.runName}>{run.name}</Text>
                    {run.description && <Text style={styles.runDesc} numberOfLines={2}>{run.description}</Text>}
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{distanceKm}</Text>
                        <Text style={styles.statLabel}>km</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{timeMins}</Text>
                        <Text style={styles.statLabel}>min</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Ionicons name="map-outline" size={24} color={COLORS.secondaryYellow} />
                        <Text style={styles.statLabel}>Route</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {selectedRunId !== null && !isCheckingDb && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleSync}>
            <Text style={styles.continueButtonText}>Sync to Crew</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  backButton: { padding: 5 },
  headerTitle: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 24 },
  content: { padding: 20, paddingBottom: 100 },
  runCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 2, borderColor: "transparent", position: "relative" },
  runCardSelected: { borderColor: COLORS.primaryOrange, backgroundColor: "rgba(231, 84, 56, 0.05)" },
  checkmarkBadge: { position: "absolute", top: -10, right: -10, backgroundColor: COLORS.primaryOrange, width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: COLORS.background, zIndex: 10 },
  runDate: { color: COLORS.textMuted, fontFamily: "Inter", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  runName: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 22, marginBottom: 6 },
  runDesc: { color: "#cbd5e1", fontFamily: "Inter", fontSize: 14, marginBottom: 15, fontStyle: "italic" },
  statsRow: { flexDirection: "row", marginTop: 15, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 15 },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 24 },
  statLabel: { color: COLORS.textMuted, fontFamily: "Inter", fontSize: 12 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  continueButton: { backgroundColor: COLORS.primaryOrange, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 18, borderRadius: 16, shadowColor: COLORS.primaryOrange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  continueButtonText: { color: "#FFF", fontFamily: "Inter", fontWeight: "bold", fontSize: 18 },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyText: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 24, marginTop: 20, marginBottom: 10 },
  emptySubtext: { color: COLORS.textMuted, fontFamily: "Inter", textAlign: "center", fontSize: 16 },
});