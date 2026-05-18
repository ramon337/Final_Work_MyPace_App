// src/screens/dashboard/CrewSettingsScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, FlatList, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useUser } from '../../context/UserContext';

export default function CrewSettingsScreen({ navigation }) {
  const { crewData } = useUser();
  const [isPublic, setIsPublic] = useState(false); // Straks koppelen we dit aan Supabase

  // Tijdelijke dummy data voor de ledenlijst
  const [members, setMembers] = useState([
    { id: '1', name: 'Jens Peeters', role: 'admin', initial: 'J', color: COLORS.primaryOrange },
    { id: '2', name: 'Sarah Smits', role: 'member', initial: 'S', color: COLORS.mascotGreen },
    { id: '3', name: 'Mark de Vries', role: 'member', initial: 'M', color: COLORS.secondaryYellow },
  ]);

  const isAdmin = true; // Dit checken we later met de echte ingelogde user

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my running crew "${crewData?.name}" on MyPace! Use my invite code: ${crewData?.invite_code}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const removeMember = (id, name) => {
    // Hier komt later de Supabase delete logica
    console.log(`Verwijder ${name}`);
    setMembers(members.filter(m => m.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crew Settings</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={28} color={COLORS.secondaryYellow} />
        </TouchableOpacity>
      </View>

      {/* PUBLIC TOGGLE (Alleen voor Admins) */}
      {isAdmin && (
        <View style={styles.settingCard}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Open to Public</Text>
            <Text style={styles.settingSub}>Allow new runners to find and join this crew without an invite code.</Text>
          </View>
          <Switch
            trackColor={{ false: '#3a3f58', true: 'rgba(92, 190, 136, 0.5)' }}
            thumbColor={isPublic ? COLORS.mascotGreen : '#f4f3f4'}
            onValueChange={() => setIsPublic(!isPublic)}
            value={isPublic}
          />
        </View>
      )}

      {/* LEDENLIJST */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Crew Members</Text>
        <Text style={styles.memberCount}>{members.length}/5</Text>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberItem}>
            <View style={[styles.avatar, { backgroundColor: item.color }]}>
              <Text style={styles.avatarText}>{item.initial}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{item.name}</Text>
              <Text style={styles.memberRole}>{item.role === 'admin' ? 'Leader' : 'Runner'}</Text>
            </View>
            
            {/* Verwijder-knop (Alleen admin ziet dit, en je kan jezelf niet verwijderen) */}
            {isAdmin && item.role !== 'admin' && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeMember(item.id, item.name)}>
                <Ionicons name="person-remove-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  iconBtn: { padding: 5 },
  headerTitle: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 24 },
  settingCard: { backgroundColor: COLORS.cardBackground, marginHorizontal: 20, padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  settingText: { flex: 1, paddingRight: 15 },
  settingTitle: { color: COLORS.textLight, fontFamily: 'Inter', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  settingSub: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  listTitle: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 20 },
  memberCount: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 14, fontWeight: 'bold' },
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  memberInfo: { flex: 1 },
  memberName: { color: COLORS.textLight, fontFamily: 'Inter', fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  memberRole: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 12, textTransform: 'capitalize' },
  removeBtn: { padding: 10, backgroundColor: 'rgba(255, 107, 107, 0.1)', borderRadius: 12 },
});