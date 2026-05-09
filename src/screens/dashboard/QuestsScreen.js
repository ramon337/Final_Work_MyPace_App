// src/screens/main/QuestsScreen.js
import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export default function QuestsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Crew Quests</Text>
      </View>

      {/* BUDDY TIP */}
      <View style={styles.buddyCard}>
        <View style={styles.buddyIcon}>
          <Ionicons name="bulb" size={20} color={COLORS.secondaryYellow} />
        </View>
        <Text style={styles.buddyText}>
          Every minute you run moves you 1 kilometer further!
        </Text>
      </View>

      {/* ACTIVE QUEST */}
      <View style={styles.activeQuestCard}>
        <View style={styles.activeHeader}>
          <Text style={styles.questTitle}>Route 66</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        </View>
        
        <Text style={styles.questSubtitle}>
          Take on the legendary Route 66 challenge together with your crew and run your way through all 3,940 km — from Chicago to Santa Monica. Every minute counts!
        </Text>

        <View style={styles.progressSection}>
          <Text style={styles.progressTopText}>0 / 3.940 km</Text>
          
          <View style={styles.progressBarBackground}>
            {/* Omdat we op 0% zitten, is de width hier 0%. Later kun je dit dynamisch maken! */}
            <View style={[styles.progressBarFill, { width: '0%' }]} /> 
          </View>
          
          <Text style={styles.progressBottomText}>0% Completed • 3.940 km to go</Text>
        </View>

        {/* Crew Contributions (Mockup met 0km omdat quest net start) */}
        <View style={styles.contributionsRow}>
          <View style={styles.avatarGroup}>
            <View style={[styles.avatar, { backgroundColor: COLORS.primaryOrange }]}><Text style={styles.avatarText}>A</Text></View>
            <View style={[styles.avatar, { backgroundColor: '#519378', marginLeft: -10 }]}><Text style={styles.avatarText}>S</Text></View>
            <View style={[styles.avatar, { backgroundColor: '#9b59b6', marginLeft: -10 }]}><Text style={styles.avatarText}>M</Text></View>
          </View>
          <Text style={styles.contributionText}>You: 0 km  •  Sarah: 0 km  •  Mark: 0 km</Text>
        </View>

        <View style={styles.rewardBox}>
          <Text style={styles.rewardText}>🎁 Rewards: 1x Rest Day Token + Route 66 Badge</Text>
        </View>
      </View>

      {/* UPCOMING QUESTS */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Next Up</Text>
        
        <View style={[styles.listCard, styles.lockedCard]}>
          <View>
            <Text style={styles.listCardTitle}>The Great Wall</Text>
            <Text style={styles.listCardSub}>8.850 km • Unlocks after Route 66</Text>
          </View>
          <Ionicons name="lock-closed" size={24} color="#999" />
        </View>

        <View style={[styles.listCard, styles.lockedCard]}>
          <View>
            <Text style={styles.listCardTitle}>Around the Equator</Text>
            <Text style={styles.listCardSub}>40.075 km • The Ultimate Test</Text>
          </View>
          <Ionicons name="lock-closed" size={24} color="#999" />
        </View>

        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>See all upcoming &gt;</Text>
        </TouchableOpacity>
      </View>

      {/* COMPLETED QUESTS */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Trophy Room</Text>
        
        <View style={styles.listCard}>
          <View>
            <Text style={styles.listCardTitle}>London to Paris</Text>
            <Text style={styles.listCardSub}>344 km • Completed yesterday 🏅</Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.secondaryYellow} />
        </View>

        <View style={styles.listCard}>
          <View>
            <Text style={styles.listCardTitle}>The Marathon</Text>
            <Text style={styles.listCardSub}>42 km • Completed last week 🏅</Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.secondaryYellow} />
        </View>
        
        <View style={styles.listCard}>
          <View>
            <Text style={styles.listCardTitle}>Central Park Loop</Text>
            <Text style={styles.listCardSub}>10 km • Completed 2 weeks ago 🏅</Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.secondaryYellow} />
        </View>

        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>View all achievements &gt;</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // #191c2f
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    marginTop: 50, // Extra ruimte voor notch/statusbalk
  },
  pageTitle: {
    fontSize: 36,
    fontFamily: 'Baloo-Bold',
    color: COLORS.textLight,
  },
  buddyCard: {
    backgroundColor: COLORS.cardBackground, // MascotGreen met transparantie
    borderWidth: 1,
    borderColor: COLORS.mascotGreen,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  buddyIcon: {
    marginRight: 10,
  },
  buddyText: {
    color: COLORS.textLight,
    fontFamily: 'Inter',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  activeQuestCard: {
    backgroundColor: COLORS.cardBackground, // #262a3e
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questTitle: {
    fontSize: 28,
    fontFamily: 'Baloo-Bold',
    color: COLORS.textLight,
  },
  activeBadge: {
    backgroundColor: 'rgba(231, 84, 56, 0.2)', // Orange transparant
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
  },
  activeBadgeText: {
    color: COLORS.primaryOrange,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    fontSize: 12,
  },
  questSubtitle: {
    color: '#cbd5e1',
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressTopText: {
    color: COLORS.textLight,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: '#191c2f', // Donkerder dan de kaart
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.secondaryYellow,
    borderRadius: 6,
  },
  progressBottomText: {
    color: '#999999',
    fontFamily: 'Inter',
    fontSize: 12,
  },
  contributionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarGroup: {
    flexDirection: 'row',
    marginRight: 15,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardBackground,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contributionText: {
    color: '#cbd5e1',
    fontFamily: 'Inter',
    fontSize: 12,
  },
  rewardBox: {
    backgroundColor: '#2e3248', // Yellow transparant
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondaryYellow,
    alignItems: 'center',
  },
  rewardText: {
    color: COLORS.secondaryYellow,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Baloo-Bold',
    color: COLORS.textLight,
    marginBottom: 15,
  },
  listCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lockedCard: {
    opacity: 0.5, // Maakt de 'Next Up' kaarten visueel inactief
  },
  listCardTitle: {
    color: COLORS.textLight,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  listCardSub: {
    color: '#999999',
    fontFamily: 'Inter',
    fontSize: 13,
  },
  seeAllButton: {
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  seeAllText: {
    color: COLORS.primaryOrange,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    fontSize: 14,
  },
});