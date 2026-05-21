// src/screens/main/StravaSyncScreen.js
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { Alert } from "react-native";
import { checkAndProgressStreak } from "../../services/streakService";

export default function StravaSyncScreen({ navigation, route }) {
  const { runs = [] } = route.params || {};
  const [selectedRunId, setSelectedRunId] = useState(null);

  // State voor de database check
  const [syncedIds, setSyncedIds] = useState([]);
  const [isCheckingDb, setIsCheckingDb] = useState(true);

  // 1. Haal op welke runs al in de database staan
  useEffect(() => {
    const fetchSyncedIds = async () => {
      const { data } = await supabase.from("runs").select("strava_activity_id");
      if (data) {
        setSyncedIds(data.map((r) => r.strava_activity_id));
      }
      setIsCheckingDb(false); // We zijn klaar met checken!
    };
    fetchSyncedIds();
  }, []);

  // 2. Filter de runs (Dit is nu de ENIGE keer dat we availableRuns aanmaken)
  const availableRuns = runs.filter((run) => !syncedIds.includes(run.id));

  // 3. De Sync Functie
  const handleSync = async () => {
    const runToSync = availableRuns.find((r) => r.id === selectedRunId);
    if (!runToSync) return;

    console.log("We gaan deze run uploaden naar de database:", runToSync.name);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Je bent niet ingelogd!");

      const { data: crewMember, error: crewError } = await supabase.from("crew_members").select("crew_id").eq("user_id", user.id).single();

      if (crewError || !crewMember) {
        throw new Error("Je zit nog niet in een Crew!");
      }

      const distanceKm = (runToSync.distance / 1000).toFixed(2);
      const timeMins = Math.round(runToSync.moving_time / 60);

      const { error: runInsertError } = await supabase.from("runs").insert({
        user_id: user.id,
        crew_id: crewMember.crew_id,
        strava_activity_id: runToSync.id,
        distance_km: parseFloat(distanceKm),
        duration_minutes: timeMins,
        run_date: runToSync.start_date,
      });

      if (runInsertError) throw runInsertError;

      const { data: crew } = await supabase.from("crews").select("total_minutes").eq("id", crewMember.crew_id).single();

      const newTotal = (crew.total_minutes || 0) + timeMins;
      
      // Update ook even de total_minutes in de crews tabel (ontbrak in je vorige snippet)
      await supabase.from("crews").update({ total_minutes: newTotal }).eq("id", crewMember.crew_id);

      const { data: activeQuests } = await supabase.from("crew_quests").select("id, current_progress").eq("crew_id", crewMember.crew_id).eq("type", "minutes");

      if (activeQuests) {
        for (const quest of activeQuests) {
          const oldProgress = quest.current_progress || 0;
          const questNewProgress = oldProgress + timeMins;

          // 🚀 CHECK: Is de quest zojuist GEFINISHED door deze run?
          if (oldProgress < quest.target_amount && questNewProgress >= quest.target_amount) {
            console.log(`🏆 QUEST VOLTOOID: ${quest.title}! Token wordt uitgereikt...`);
            
            // Haal huidige tokens op
            const { data: crewData } = await supabase.from("crews").select("rest_day_tokens").eq("id", crewMember.crew_id).single();
            
            if (crewData) {
              // Verhoog met 1, maar zet een keiharde limiet op 5 (Math.min voorkomt dat het boven de 5 stijgt)
              const newTokens = Math.min(crewData.rest_day_tokens + 1, 5);
              await supabase.from("crews").update({ rest_day_tokens: newTokens }).eq("id", crewMember.crew_id);
              
              console.log(`🛡️ Token toegevoegd! Nieuw totaal: ${newTokens}/5`);
            }
          }

          // Update de voortgang van de quest
          await supabase.from("crew_quests").update({ current_progress: questNewProgress }).eq("id", quest.id);
        }
        console.log(`🚀 Quest voortgang succesvol verhoogd met ${timeMins} minutes!`);
      }

      await supabase.from("crew_activity_log").insert({
        crew_id: crewMember.crew_id,
        user_id: user.id,
        event_type: "run_uploaded",
        metadata: {
          run_name: runToSync.name,
          distance_km: parseFloat(distanceKm),
          duration_minutes: timeMins,
        },
      });

      console.log(`🎉 Succes! ${timeMins} minuten toegevoegd aan de Crew!`);

      // 🚀 STREAK ENGINE VALIDATIE AANROEPEN
      const streakResult = await checkAndProgressStreak(crewMember.crew_id, user.id);

      if (streakResult.status === 'day_completed') {
        Alert.alert(
          "🔥 STREAK UP!", 
          `Geweldig! Iedereen die vandaag de baton had heeft gelopen! De streak staat nu op ${streakResult.newStreak} dagen!`,
          [{ text: "Awesome!", onPress: () => navigation.goBack() }]
        );
      } else if (streakResult.status === 'waiting_for_partner') {
        Alert.alert(
          "Run Gelogd! ⏳", 
          `Jouw deel zit er op! We wachten nu nog op je teamgenoot die vandaag ook de baton heeft om de streak veilig te stellen.`,
          [{ text: "Check", onPress: () => navigation.goBack() }]
        );
      } else {
        // Voor rest days, of als ze vandaag niet aan de beurt waren
        Alert.alert(
          "Run Gesynced! 🏃", 
          `Lekker bezig! Je run is succesvol toegevoegd aan de totale minuten van de crew.`,
          [{ text: "Top!", onPress: () => navigation.goBack() }]
        );
      }

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

      {/* ALS WE NOG AAN HET CHECKEN ZIJN, TOON EEN LADER */}
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
              <Text style={styles.emptySubtext}>No new runs found in the last 3 days.</Text>
            </View>
          ) : (
            availableRuns.map((run) => {
              const isSelected = selectedRunId === run.id;
              const distanceKm = (run.distance / 1000).toFixed(2);
              const timeMins = Math.round(run.moving_time / 60);

              const runDate = new Date(run.start_date_local).toLocaleDateString("nl-NL", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });

              return (
                <TouchableOpacity key={run.id} activeOpacity={0.9} onPress={() => setSelectedRunId(run.id)} style={[styles.runCard, isSelected ? styles.runCardSelected : null]}>
                  {isSelected ? (
                    <View style={styles.checkmarkBadge}>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                  ) : null}

                  <View style={styles.runInfo}>
                    <Text style={styles.runDate}>
                      {runDate} • {run.type}
                    </Text>
                    <Text style={styles.runName}>{run.name}</Text>

                    {run.description ? (
                      <Text style={styles.runDesc} numberOfLines={2}>
                        {run.description}
                      </Text>
                    ) : null}

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

      {selectedRunId !== null && !isCheckingDb ? (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleSync}>
            <Text style={styles.continueButtonText}>Sync to Crew</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      ) : null}
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
  checkmarkBadge: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: COLORS.primaryOrange,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.background,
    zIndex: 10,
  },
  runDate: { color: COLORS.textMuted, fontFamily: "Inter", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  runName: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 22, marginBottom: 6 },
  runDesc: { color: "#cbd5e1", fontFamily: "Inter", fontSize: 14, marginBottom: 15, fontStyle: "italic" },
  statsRow: { flexDirection: "row", marginTop: 15, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 15 },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 24 },
  statLabel: { color: COLORS.textMuted, fontFamily: "Inter", fontSize: 12 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  continueButton: {
    backgroundColor: COLORS.primaryOrange,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: { color: "#FFF", fontFamily: "Inter", fontWeight: "bold", fontSize: 18 },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyText: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 24, marginTop: 20, marginBottom: 10 },
  emptySubtext: { color: COLORS.textMuted, fontFamily: "Inter", textAlign: "center", fontSize: 16 },
});
