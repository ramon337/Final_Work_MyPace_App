// src/screens/dashboard/QuestsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabase';

const MASTER_CHALLENGES = [
  { 
    id: "c1", 
    title: "The Marathon", 
    subtitle: "Run for 42 minutes to conquer the classic distance", 
    target_amount: 42, 
    image: require('../../assets/images/quest-1-image.jpeg') 
  },
  { 
    id: "c2", 
    title: "Centurion", 
    subtitle: "Log 100 minutes of running as a crew", 
    target_amount: 100, 
    image: require('../../assets/images/quest-2-image.jpeg') 
  },
  { 
    id: "c3", 
    title: "London to Paris", 
    subtitle: "Run 342 minutes to virtually cross the channel", 
    target_amount: 342, 
    image: require('../../assets/images/quest-3-image.jpeg')
  },
  { 
    id: "c4", 
    title: "Camino de Santiago", 
    subtitle: "Conquer the famous route in 790 minutes", 
    target_amount: 790, 
    image: require('../../assets/images/quest-4-image.jpeg')
  },
  { 
    id: "c5", 
    title: "Route 66", 
    subtitle: "The ultimate 3,940 minutes roadtrip", 
    target_amount: 3940, 
    image: require('../../assets/images/quest-5-image.jpeg')
  },
  { 
    id: "c6", 
    title: "Great Wall of China", 
    subtitle: "An epic 21,196 minutes expedition", 
    target_amount: 21196,
    image: require('../../assets/images/quest-6-image.jpg')
  },
  { 
    id: "c7", 
    title: "Around the World", 
    subtitle: "The ultimate boss: 40,075 minutes", 
    target_amount: 40075,
    image: require('../../assets/images/quest-7-image.jpg')
  },
];

const getQuestImage = (target) => {
  const template = MASTER_CHALLENGES.find(q => q.target_amount === target);
  return template ? template.image : require('../../assets/images/quest-1-image.jpeg');
};


export default function QuestsScreen({ navigation }) {
  const { crewData, loading: contextLoading } = useUser();
  const [activeQuests, setActiveQuests] = useState([]);
  const [completedQuests, setCompletedQuests] = useState([]);
  const [loadingQuests, setLoadingQuests] = useState(true);
  
  const [isModalVisible, setModalVisible] = useState(false);
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

      const active = data ? data.filter(q => q.current_progress < q.target_amount) : [];
      const completed = data ? data.filter(q => q.current_progress >= q.target_amount) : [];

      if (active.length === 0 && !isInsertingRef.current) {
        isInsertingRef.current = true; 

        const existingTargets = data ? data.map(q => q.target_amount) : [];
        const nextQuestTemplate = MASTER_CHALLENGES.find(q => !existingTargets.includes(q.target_amount));

        if (nextQuestTemplate) {
          const { data: newQuest } = await supabase
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
            setActiveQuests([newQuest[0]]); 
            setCompletedQuests(completed);
          }
        } else {
          setActiveQuests([]);
          setCompletedQuests(completed);
        }

        isInsertingRef.current = false; 
      } else {
        setActiveQuests(active);
        setCompletedQuests(completed);
      }

    } catch (error) {
      console.error("Fout bij ophalen quests:", error);
      isInsertingRef.current = false; 
    } finally {
      setLoadingQuests(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchQuests);
    fetchQuests(); 
    return unsubscribe;
  }, [navigation, crewData]);

  const activeAndCompletedTargets = [...activeQuests, ...completedQuests].map(q => q.target_amount);
  const upcomingQuests = MASTER_CHALLENGES.filter(q => !activeAndCompletedTargets.includes(q.target_amount));
  const previewUpcoming = upcomingQuests.slice(0, 2);

  // A. Eerst checken of de usercontext nog laadt
  if (contextLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrange} />
      </View>
    );
  }

  // B. 🚀 NIEUW: EMPTY STATE ALS DE USER GEEN CREW HEEFT
  if (!crewData || !crewData.id) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 30 }]}>
        <Ionicons name="map-outline" size={100} color={COLORS.textMuted} />
        <Text style={{ color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 32, marginTop: 20, marginBottom: 10, textAlign: 'center' }}>No Quests Yet</Text>
        <Text style={{ color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 }}>
          You need to be part of a crew to unlock epic running challenges like The Marathon or Route 66.
        </Text>
        <TouchableOpacity 
          style={styles.viewAllButton} 
          activeOpacity={0.8} 
          onPress={() => navigation.getParent()?.navigate("AccountSetup") || navigation.navigate("AccountSetup")}
        >
          <Text style={[styles.viewAllText, { fontSize: 18 }]}>Join or Create a Crew</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // C. Als hij wel in een crew zit, maar de quests nog laden
  if (loadingQuests) {
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
                  {/* 🚀 Active Quest Thumbnail */}
                  <Image source={getQuestImage(quest.target_amount)} style={styles.activeQuestImage} />
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
            <View style={styles.lockedImageContainer}>
              <Image source={quest.image} style={styles.coverImage} blurRadius={2} />
              <View style={styles.darkOverlay} />
              <Ionicons name="lock-closed" size={20} color="#FFF" style={styles.absoluteCenterIcon} />
            </View>
            <View style={styles.lockedQuestInfo}>
              <Text style={styles.lockedQuestTitle}>{quest.title}</Text>
              <Text style={styles.lockedQuestSubtitle}>{quest.subtitle}</Text>
            </View>
          </View>
        ))}

        {/* VIEW ALL BUTTON */}
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
                <View style={styles.trophyImageContainer}>
                  <Image source={getQuestImage(quest.target_amount)} style={styles.coverImage} />
                  {/* Klein groen vinkje als badge over de foto heen */}
                  <View style={styles.trophyCheckmarkBadge}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                </View>
                <Text style={styles.trophyTitle} numberOfLines={1}>{quest.title}</Text>
                <Text style={styles.trophySubtitle}>{quest.target_amount} {quest.type || "min"}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      {/* DE VIEW ALL MODAL */}
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
                const isCompleted = completedQuests.some(q => q.target_amount === challenge.target_amount);
                const isActive = activeQuests.some(q => q.target_amount === challenge.target_amount);
                
                let cardStyle = styles.roadmapCardLocked;
                let titleColor = COLORS.textMuted;
                let overlayColor = 'rgba(0,0,0,0.6)'; // Donker over gelockte items
                let statusIcon = "lock-closed";
                let iconColor = "#FFF";
                
                if (isCompleted) {
                  cardStyle = styles.roadmapCardCompleted;
                  titleColor = COLORS.mascotGreen;
                  overlayColor = 'transparent'; // Geen overlay, toon de foto puur!
                  statusIcon = "checkmark-circle";
                  iconColor = COLORS.mascotGreen;
                } else if (isActive) {
                  cardStyle = styles.roadmapCardActive;
                  titleColor = COLORS.secondaryYellow;
                  overlayColor = 'rgba(249, 212, 35, 0.2)'; // Lichtgele gloed
                  statusIcon = "play-circle";
                  iconColor = COLORS.secondaryYellow;
                }

                return (
                  <View key={challenge.id} style={cardStyle}>
                    <View style={styles.lockedImageContainer}>
                      <Image source={challenge.image} style={styles.coverImage} blurRadius={!isCompleted && !isActive ? 2 : 0} />
                      <View style={[styles.darkOverlay, { backgroundColor: overlayColor }]} />
                    </View>
                    <View style={styles.roadmapInfo}>
                      <Text style={[styles.roadmapTitle, { color: titleColor }]}>
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
  activeQuestImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#3a3f58' },
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

  // Locked Quests & Images
  lockedQuestCard: { flexDirection: "row", alignItems: "center", backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  lockedImageContainer: { width: 50, height: 50, borderRadius: 12, overflow: 'hidden', marginRight: 15, position: 'relative' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  absoluteCenterIcon: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -10 }, { translateY: -10 }] },
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
  trophyImageContainer: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', marginBottom: 10, position: 'relative' },
  trophyCheckmarkBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.mascotGreen, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.cardBackground },
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
  roadmapInfo: { flex: 1 },
  roadmapTitle: { color: COLORS.textMuted, fontFamily: "Baloo-Bold", fontSize: 18, marginBottom: 2 },
  roadmapSubtitle: { color: 'rgba(255,255,255,0.4)', fontFamily: "Inter", fontSize: 13 },
});