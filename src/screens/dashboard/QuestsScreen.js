// src/screens/dashboard/QuestsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabase';

// 🚀 JOUW NIEUWE ROADMAP AAN CHALLENGES (Van makkelijk naar extreem)
const MASTER_CHALLENGES = [
  { id: "c1", title: "The Marathon", subtitle: "Run for 42 minutes", target_amount: 42, icon: "footsteps" },
  { id: "c2", title: "Centurion", subtitle: "Reach 100 minutes of running", target_amount: 100, icon: "shield-checkmark" },
  { id: "c3", title: "Spartan Endurance", subtitle: "Conquer 250 minutes", target_amount: 250, icon: "bonfire" },
  { id: "c4", title: "Everest Basecamp", subtitle: "Climb to 1000 minutes", target_amount: 1000, icon: "triangle" },
  { id: "c5", title: "Route 66", subtitle: "The ultimate 4000 minutes journey", target_amount: 4000, icon: "map" },
];

export default function QuestsScreen({ navigation }) {
  const { crewData, loading: contextLoading } = useUser();
  const [activeQuests, setActiveQuests] = useState([]);
  const [completedQuests, setCompletedQuests] = useState([]);
  const [loadingQuests, setLoadingQuests] = useState(true);
  
  const [isModalVisible, setModalVisible] = useState(false);

  // 🚀 HET SLOT OP DE DEUR: Voorkomt dubbele inserts door de race-condition
  const isInsertingRef = useRef(false);

  const fetchQuests = async () => {
    if (!crewData?.id) {
      setLoadingQuests(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('crew_quests')
        .select('*')
        .eq('crew_id', crewData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Verdeel ze in actief en voltooid
      const active = data ? data.filter(q => q.current_progress < q.target_amount) : [];
      const completed = data ? data.filter(q => q.current_progress >= q.target_amount) : [];

      // 🚀 ALS ER GEEN ACTIEVE QUEST IS, EN WE ZIJN NIET AL AAN HET INSERTEN...
      if (active.length === 0 && !isInsertingRef.current) {
        isInsertingRef.current = true; // Doe de deur op slot!

        // Kijk welke target_amounts we al in de database hebben staan
        const existingTargets = data ? data.map(q => q.target_amount) : [];
        
        // Zoek de EERSTE challenge in onze roadmap die nog NIET in de database staat
        const nextQuestTemplate = MASTER_CHALLENGES.find(q => !existingTargets.includes(q.target_amount));

        if (nextQuestTemplate) {
          console.log(`Geen actieve quest. We starten automatisch met: ${nextQuestTemplate.title}`);
          
          const { data: newQuest, error: insertError } = await supabase
            .from('crew_quests')
            .insert({
              crew_id: crewData.id,
              title: nextQuestTemplate.title,
              subtitle: nextQuestTemplate.subtitle,
              target_amount: nextQuestTemplate.target_amount,
              current_progress: 0,
              type: 'minutes'
            })
            .select();

          if (newQuest && newQuest.length > 0) {
            setActiveQuests([newQuest[0]]); // Zet de nieuwe quest actief in het scherm
            setCompletedQuests(completed);
          }
        } else {
          // Als de speler Route 66 heeft gehaald en er écht niks meer over is!
          setActiveQuests([]);
          setCompletedQuests(completed);
        }

        isInsertingRef.current = false; // Haal de deur weer van het slot
      } else {
        // Normale weergave: er was al gewoon een actieve quest bezig
        setActiveQuests(active);
        setCompletedQuests(completed);
      }

    } catch (error) {
      console.error("Fout bij ophalen quests:", error);
      isInsertingRef.current = false; // Mocht er een error zijn, gooi slot eraf
    } finally {
      setLoadingQuests(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchQuests);
    fetchQuests(); 
    return unsubscribe;
  }, [navigation, crewData]);

  // 🚀 BEREKEN WELKE QUESTS NOG "UPCOMING" ZIJN VOOR DE UI
  const activeAndCompletedTargets = [...activeQuests, ...completedQuests].map(q => q.target_amount);
  const upcomingQuests = MASTER_CHALLENGES.filter(q => !activeAndCompletedTargets.includes(q.target_amount));
  
  // Pak alleen de eerste 2 voor de preview op het dashboard
  const previewUpcoming = upcomingQuests.slice(0, 2);

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
        <Text style={styles.headerTitle}>Crew Quests</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* 1. ACTIEVE QUESTS */}
        <Text style={styles.sectionTitle}>Current Quest</Text>
        {activeQuests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No active quests right now.</Text>
            {/* Suggestie als alles leeg is: Start The Marathon! */}
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
                      {quest.current_progress} / {quest.target_amount} {quest.type || "min"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* 2. UPCOMING QUESTS PREVIEW */}
        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Upcoming Quests</Text>
        {previewUpcoming.map(quest => (
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

        {/* 🚀 VIEW ALL BUTTON */}
        <TouchableOpacity style={styles.viewAllButton} activeOpacity={0.7} onPress={() => setModalVisible(true)}>
          <Text style={styles.viewAllText}>View all challenges &gt;</Text>
        </TouchableOpacity>

        {/* 3. TROPHY ROOM */}
        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Trophy Room</Text>
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
                <Text style={styles.trophySubtitle}>{quest.target_amount} {quest.type || "min"}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      {/* 🚀 DE VIEW ALL MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Challenge Roadmap</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close-circle" size={32} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              {MASTER_CHALLENGES.map((challenge, index) => {
                // Bepaal de status van de challenge in de pop-up
                const isCompleted = completedQuests.some(q => q.target_amount === challenge.target_amount);
                const isActive = activeQuests.some(q => q.target_amount === challenge.target_amount);
                
                let cardStyle = styles.roadmapCardLocked;
                let iconColor = COLORS.textMuted;
                let iconBg = 'rgba(255,255,255,0.05)';
                let statusIcon = "lock-closed";
                
                if (isCompleted) {
                  cardStyle = styles.roadmapCardCompleted;
                  iconColor = COLORS.mascotGreen;
                  iconBg = 'rgba(92, 190, 136, 0.1)';
                  statusIcon = "checkmark-circle";
                } else if (isActive) {
                  cardStyle = styles.roadmapCardActive;
                  iconColor = COLORS.secondaryYellow;
                  iconBg = 'rgba(249, 212, 35, 0.1)';
                  statusIcon = "play-circle";
                }

                return (
                  <View key={challenge.id} style={cardStyle}>
                    <View style={[styles.roadmapIconBg, { backgroundColor: iconBg }]}>
                      <Ionicons name={challenge.icon} size={24} color={iconColor} />
                    </View>
                    <View style={styles.roadmapInfo}>
                      <Text style={[styles.roadmapTitle, isActive && { color: COLORS.secondaryYellow }, isCompleted && { color: COLORS.mascotGreen }]}>
                        {challenge.title}
                      </Text>
                      <Text style={styles.roadmapSubtitle}>{challenge.target_amount} minutes</Text>
                    </View>
                    <Ionicons name={statusIcon} size={24} color={iconColor} />
                  </View>
                );
              })}
            </ScrollView>

          </View>
        </View>
      </Modal>

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

  // View All Button
  viewAllButton: { alignItems: 'center', paddingVertical: 10 },
  viewAllText: { color: COLORS.secondaryYellow, fontFamily: 'Inter', fontWeight: 'bold', fontSize: 14 },

  // Trophies
  emptyTrophyCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 25, alignItems: "center", borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  emptyStateText: { color: COLORS.textMuted, fontFamily: "Inter", textAlign: "center", marginTop: 10, lineHeight: 22 },
  horizontalScroll: { overflow: 'visible' },
  trophyCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 15, width: 140, marginRight: 15, alignItems: "center", borderWidth: 1, borderColor: 'rgba(92, 190, 136, 0.3)' },
  trophyIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(92, 190, 136, 0.1)', justifyContent: "center", alignItems: "center", marginBottom: 10 },
  trophyTitle: { color: COLORS.textLight, fontFamily: "Inter", fontWeight: "bold", fontSize: 14, marginBottom: 4, textAlign: "center" },
  trophySubtitle: { color: COLORS.mascotGreen, fontFamily: "Inter", fontSize: 12 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.cardBackground, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 25 },
  modalTitle: { fontSize: 26, fontFamily: "Baloo-Bold", color: COLORS.textLight },
  closeButton: { padding: 5, marginRight: -5 },

  // Roadmap Cards (In de modal)
  roadmapCardLocked: { flexDirection: "row", alignItems: "center", backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  roadmapCardActive: { flexDirection: "row", alignItems: "center", backgroundColor: 'rgba(249, 212, 35, 0.05)', borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(249, 212, 35, 0.3)' },
  roadmapCardCompleted: { flexDirection: "row", alignItems: "center", backgroundColor: 'rgba(92, 190, 136, 0.05)', borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(92, 190, 136, 0.3)' },
  roadmapIconBg: { width: 50, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 15 },
  roadmapInfo: { flex: 1 },
  roadmapTitle: { color: COLORS.textMuted, fontFamily: "Baloo-Bold", fontSize: 18, marginBottom: 2 },
  roadmapSubtitle: { color: 'rgba(255,255,255,0.4)', fontFamily: "Inter", fontSize: 13 },
});