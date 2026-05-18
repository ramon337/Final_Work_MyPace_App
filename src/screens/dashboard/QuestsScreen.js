// src/screens/dashboard/QuestsScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabase';

// Hardcoded "Teasers"
const UPCOMING_QUESTS = [
  { id: "u1", title: "Athens Marathon", subtitle: "Run the original 42.2 km", icon: "footsteps" },
  { id: "u2", title: "Everest Basecamp", subtitle: "Climb 5,364m together", icon: "triangle" },
];

export default function QuestsScreen({ navigation }) {
  const { crewData, loading: contextLoading } = useUser();
  const [activeQuests, setActiveQuests] = useState([]);
  const [completedQuests, setCompletedQuests] = useState([]);
  const [loadingQuests, setLoadingQuests] = useState(true);

  const fetchQuests = async () => {
    if (!crewData?.id) {
      setLoadingQuests(false);
      return;
    }
    if (activeQuests.length === 0 && completedQuests.length === 0) {
      setLoadingQuests(true);
    }
    
    try {
      const { data, error } = await supabase
        .from('crew_quests')
        .select('*')
        .eq('crew_id', crewData.id)
        .order('created_at', { ascending: false });

      if (data) {
        setActiveQuests(data.filter(q => q.current_progress < q.target_amount));
        setCompletedQuests(data.filter(q => q.current_progress >= q.target_amount));
      }
    } catch (error) {
      console.error("Fout bij ophalen quests:", error);
    } finally {
      setLoadingQuests(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchQuests);
    fetchQuests(); 
    return unsubscribe;
  }, [navigation, crewData]);

  if (contextLoading || loadingQuests) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrange} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quests</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* 1. ACTIEVE QUESTS */}
        <Text style={styles.sectionTitle}>Current Quest</Text>
        {activeQuests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No active quests right now.</Text>
          </View>
        ) : (
          activeQuests.map((quest) => {
            const progressPercent = Math.min((quest.current_progress / quest.target_amount) * 100, 100);
            return (
              <View key={quest.id} style={styles.questCard}>
                <View style={styles.questHeader}>
                  <Ionicons name="map-sharp" size={24} color={COLORS.secondaryYellow} />
                  <View style={styles.questMeta}>
                    <Text style={styles.questTitle}>{quest.title}</Text>
                    <Text style={styles.questSubtitle}>{quest.subtitle}</Text>
                  </View>
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <View style={styles.progressTextRow}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressNumbers}>
                      {quest.current_progress} / {quest.target_amount} {quest.type}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* 2. UPCOMING QUESTS */}
        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Upcoming Quests</Text>
        {UPCOMING_QUESTS.map(quest => (
          <View key={quest.id} style={styles.lockedQuestCard}>
            <View style={styles.lockedIconBg}>
              <Ionicons name={quest.icon} size={24} color={COLORS.textMuted} />
            </View>
            <View style={styles.lockedQuestInfo}>
              <Text style={styles.lockedQuestTitle}>{quest.title}</Text>
              <Text style={styles.lockedQuestSubtitle}>{quest.subtitle}</Text>
            </View>
            <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} />
          </View>
        ))}

        {/* 3. TROPHY ROOM */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Trophy Room</Text>
        {completedQuests.length === 0 ? (
          <View style={styles.emptyTrophyCard}>
            <Ionicons name="medal-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>Complete quests to unlock trophies!</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {completedQuests.map(quest => (
              <View key={quest.id} style={styles.trophyCard}>
                <View style={styles.trophyIconBg}>
                  <Ionicons name="checkmark-circle" size={32} color={COLORS.mascotGreen} />
                </View>
                <Text style={styles.trophyTitle} numberOfLines={1}>{quest.title}</Text>
                <Text style={styles.trophySubtitle}>{quest.target_amount} {quest.type}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  headerTitle: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 32 },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 22, marginBottom: 15 },
  
  // Active Quest
  questCard: { backgroundColor: COLORS.cardBackground, borderRadius: 20, padding: 20, marginBottom: 25 },
  questHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  questMeta: { marginLeft: 15, flex: 1 },
  questTitle: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 20, marginBottom: 4 },
  questSubtitle: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 14, lineHeight: 20 },
  progressContainer: { width: '100%' },
  progressBarBackground: { width: '100%', height: 12, backgroundColor: '#3a3f58', borderRadius: 6, overflow: 'hidden', marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primaryOrange, borderRadius: 6 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  progressNumbers: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 16 },
  emptyState: { alignItems: 'center', padding: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, marginBottom: 25 },
  emptyText: { color: COLORS.textMuted, fontFamily: 'Inter', marginTop: 10, fontSize: 14 },

  // Locked Quests
  lockedQuestCard: { flexDirection: "row", alignItems: "center", backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  lockedIconBg: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: "center", alignItems: "center", marginRight: 15 },
  lockedQuestInfo: { flex: 1 },
  lockedQuestTitle: { color: COLORS.textMuted, fontFamily: "Inter", fontWeight: "bold", fontSize: 16, marginBottom: 2 },
  lockedQuestSubtitle: { color: 'rgba(255,255,255,0.3)', fontFamily: "Inter", fontSize: 13 },

  // Trophies
  emptyTrophyCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 25, alignItems: "center", borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  emptyStateText: { color: COLORS.textMuted, fontFamily: "Inter", textAlign: "center", marginTop: 10, lineHeight: 22 },
  horizontalScroll: { overflow: 'visible' },
  trophyCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 15, width: 140, marginRight: 15, alignItems: "center", borderWidth: 1, borderColor: 'rgba(92, 190, 136, 0.3)' },
  trophyIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(92, 190, 136, 0.1)', justifyContent: "center", alignItems: "center", marginBottom: 10 },
  trophyTitle: { color: COLORS.textLight, fontFamily: "Inter", fontWeight: "bold", fontSize: 14, marginBottom: 4, textAlign: "center" },
  trophySubtitle: { color: COLORS.mascotGreen, fontFamily: "Inter", fontSize: 12 },
});