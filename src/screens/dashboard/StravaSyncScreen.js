// src/screens/main/StravaSyncScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function StravaSyncScreen({ navigation, route }) {
  const { runs = [] } = route.params || {};
  const [selectedRunId, setSelectedRunId] = useState(null);

  const alreadySyncedRunIds = [987654321]; 
  const availableRuns = runs.filter(run => !alreadySyncedRunIds.includes(run.id));

const handleSync = async () => {
    const runToSync = availableRuns.find(r => r.id === selectedRunId);
    if (!runToSync) return;

    console.log("We gaan deze run uploaden naar de database:", runToSync.name);

    try {
      // 1. Haal de ID van de huidige ingelogde gebruiker op
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Je bent niet ingelogd!");

      // 2. Zoek in welke Crew deze gebruiker zit
      const { data: crewMember, error: crewError } = await supabase
        .from('crew_members')
        .select('crew_id')
        .eq('user_id', user.id)
        .single();

      if (crewError || !crewMember) {
        throw new Error("Je zit nog niet in een Crew!");
      }

      const distanceKm = (runToSync.distance / 1000).toFixed(2);
      const timeMins = Math.round(runToSync.moving_time / 60);

      // 3. Sla de run op in de 'runs' tabel
      const { error: runInsertError } = await supabase
        .from('runs')
        .insert({
          user_id: user.id,
          crew_id: crewMember.crew_id,
          strava_activity_id: runToSync.id, // Dit voorkomt dubbele uploads later!
          distance_km: parseFloat(distanceKm),
          duration_minutes: timeMins,
          run_date: runToSync.start_date
        });

      if (runInsertError) throw runInsertError;

      // 4. Tel de minuten op bij het totaal van de Crew
      // Haal eerst het huidige totaal op:
      const { data: crew } = await supabase
        .from('crews')
        .select('total_minutes')
        .eq('id', crewMember.crew_id)
        .single();

      const newTotal = (crew.total_minutes || 0) + timeMins;

      // Update de crew met het nieuwe totaal:
      await supabase
        .from('crews')
        .update({ total_minutes: newTotal })
        .eq('id', crewMember.crew_id);

      console.log(`🎉 Succes! ${timeMins} minuten toegevoegd aan de Crew!`);
      
      // Ga terug naar het dashboard!
      navigation.goBack();

    } catch (error) {
      console.error("Fout bij syncen:", error.message);
      // Hier zou je later een mooie Alert() voor de gebruiker kunnen maken
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
            
            const runDate = new Date(run.start_date_local).toLocaleDateString('nl-NL', {
              weekday: 'short', day: 'numeric', month: 'short'
            });

            return (
              <TouchableOpacity 
                key={run.id}
                activeOpacity={0.9}
                onPress={() => setSelectedRunId(run.id)}
                style={[
                  styles.runCard,
                  isSelected ? styles.runCardSelected : null
                ]}
              >
                {isSelected ? (
                  <View style={styles.checkmarkBadge}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  </View>
                ) : null}

                <View style={styles.runInfo}>
                  <Text style={styles.runDate}>{runDate} • {run.type}</Text>
                  <Text style={styles.runName}>{run.name}</Text>
                  
                  {run.description ? (
                    <Text style={styles.runDesc} numberOfLines={2}>{run.description}</Text>
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

      {selectedRunId !== null ? (
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  backButton: { padding: 5 },
  headerTitle: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 24 },
  content: { padding: 20, paddingBottom: 100 },
  runCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  runCardSelected: { borderColor: COLORS.primaryOrange, backgroundColor: 'rgba(231, 84, 56, 0.05)' },
  checkmarkBadge: { position: 'absolute', top: -10, right: -10, backgroundColor: COLORS.primaryOrange, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.background, zIndex: 10 },
  runDate: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  runName: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 22, marginBottom: 6 },
  runDesc: { color: '#cbd5e1', fontFamily: 'Inter', fontSize: 14, marginBottom: 15, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', marginTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 24 },
  statLabel: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 12 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  continueButton: { backgroundColor: COLORS.primaryOrange, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 18, borderRadius: 16, shadowColor: COLORS.primaryOrange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  continueButtonText: { color: '#FFF', fontFamily: 'Inter', fontWeight: 'bold', fontSize: 18 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 24, marginTop: 20, marginBottom: 10 },
  emptySubtext: { color: COLORS.textMuted, fontFamily: 'Inter', textAlign: 'center', fontSize: 16 }
});