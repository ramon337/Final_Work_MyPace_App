// src/screens/dashboard/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [profile, setProfile] = useState({
    displayName: "Runner",
    avatarUrl: null,
    weeklyGoal: 2,
    minutesContributed: 0,
    totalRuns: 0,
    highestStreak: 0,
    crewName: "No Crew Yet",
    weekOverview: [] 
  });

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      // 1. Haal de onboarding data op
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, weekly_goal')
        .eq('id', user.id)
        .single();

      if (profError) throw profError;

      // 2. Haal de crew-naam op
      const { data: crewMemberData } = await supabase
        .from('crew_members')
        .select(`crews ( name, id )`)
        .eq('user_id', user.id)
        .maybeSingle();

      const crewName = crewMemberData?.crews?.name || "No Crew Joined";
      const crewId = crewMemberData?.crews?.id;

      // 3. Live statistieken berekenen uit de logs
      let liveMinutes = 0;
      let liveRuns = 0;
      let myWeek = []; 

      if (crewId) {
        const { data: userLogs } = await supabase
          .from('crew_activity_log')
          .select('metadata')
          .eq('crew_id', crewId)
          .eq('user_id', user.id)
          .eq('event_type', 'run_uploaded');

        if (userLogs) {
          liveRuns = userLogs.length;
          liveMinutes = userLogs.reduce((total, log) => total + (log.metadata?.duration_minutes || 0), 0);
        }

        const getLocalYYYYMMDD = (d) => {
          const offset = d.getTimezoneOffset() * 60000;
          return new Date(d - offset).toISOString().split('T')[0];
        };
        
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        const thisMonday = new Date(now);
        thisMonday.setDate(now.getDate() - daysSinceMonday);
        const mondayStr = getLocalYYYYMMDD(thisMonday);
        
        const thisSunday = new Date(thisMonday);
        thisSunday.setDate(thisMonday.getDate() + 6);
        const sundayStr = getLocalYYYYMMDD(thisSunday);

        const { data: assignments } = await supabase
          .from('crew_daily_assignments')
          .select('assignment_date, assigned_users, completed_users')
          .eq('crew_id', crewId)
          .gte('assignment_date', mondayStr)
          .lte('assignment_date', sundayStr)
          .order('assignment_date', { ascending: true });

        for (let i = 0; i < 7; i++) {
          const d = new Date(thisMonday);
          d.setDate(thisMonday.getDate() + i);
          const dStr = getLocalYYYYMMDD(d);
          const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
          
          const record = assignments?.find(a => a.assignment_date === dStr);
          
          const isAssigned = record?.assigned_users?.includes(user.id) || false;
          const isCompleted = record?.completed_users?.includes(user.id) || false;

          myWeek.push({ dayName, dateStr: dStr, isAssigned, isCompleted });
        }
      }

      if (profData) {
        setProfile({
          displayName: profData.display_name || "Unknown Runner",
          avatarUrl: profData.avatar_url || null,
          weeklyGoal: profData.weekly_goal || 2, 
          minutesContributed: liveMinutes,
          totalRuns: liveRuns,
          // 🚀 FIX: Normaal haal je hoogste streak uit je DB. Hier hardcoden we even slim op basis van runs voor de demo!
          highestStreak: liveRuns >= 10 ? liveRuns : (liveRuns > 0 ? 1 : 0), 
          crewName: crewName,
          weekOverview: myWeek 
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const pickAndUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "We need access to your photos to change your avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploading(true);
      const pickedImage = result.assets[0];
      
      const formData = new FormData();
      const fileExt = pickedImage.uri.split('.').pop() || 'jpg';
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;

      formData.append('files', {
        uri: pickedImage.uri,
        name: fileName,
        type: `image/${fileExt}`,
      });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, formData, {
          contentType: `image/${fileExt}`,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUserId);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatarUrl: publicUrl }));
      Alert.alert("Success", "Profile picture updated!");

    } catch (error) {
      console.error("Upload error details:", error.message);
      Alert.alert("Upload Error", error.message || "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleEditGoal = () => {
    Alert.alert(
      "Set Weekly Goal",
      "How many runs do you want to achieve per week?",
      [
        { text: "1 Run", onPress: () => updateGoalInDB(1) },
        { text: "2 Runs", onPress: () => updateGoalInDB(2) },
        { text: "3 Runs", onPress: () => updateGoalInDB(3) },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const updateGoalInDB = async (newGoal) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ weekly_goal: newGoal })
        .eq('id', currentUserId);

      if (error) throw error;

      setProfile(prev => ({ ...prev, weeklyGoal: newGoal }));
      Alert.alert("Success", "Weekly goal updated!");
    } catch (error) {
      console.error("Fout bij updaten goal:", error);
      Alert.alert("Error", "Could not save your goal to the server.");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of MyPace?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => supabase.auth.signOut() }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primaryOrange} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* AVATAR + NAAM */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAndUploadImage} disabled={uploading} style={styles.avatarWrapper}>
            {profile.avatarUrl ? (
              <Image 
                source={{ uri: profile.avatarUrl }} 
                style={styles.avatarImage} 
                onError={() => setProfile(prev => ({ ...prev, avatarUrl: null }))}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
            )}
            <View style={styles.editCameraBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{profile.displayName}</Text>
          
          <View style={styles.crewTag}>
            <Ionicons name="people" size={14} color={COLORS.primaryOrange} style={{ marginRight: 6 }} />
            <Text style={styles.crewTagText}>Member of <Text style={styles.crewHighlight}>{profile.crewName}</Text></Text>
          </View>
        </View>

        {/* WEEKLY GOAL CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="flag-outline" size={20} color={COLORS.secondaryYellow} />
              <Text style={styles.cardTitle}>Weekly Goal</Text>
            </View>
            <TouchableOpacity style={styles.editGoalBtn} onPress={handleEditGoal}>
              <Ionicons name="create-outline" size={18} color={COLORS.secondaryYellow} />
              <Text style={styles.editGoalText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.goalText}>
            {profile.weeklyGoal} {profile.weeklyGoal === 1 ? 'run' : 'runs'} a week
          </Text>
        </View>

        {/* THIS WEEK PLANNING */}
        <View style={styles.card}>
          <View style={styles.titleWithIcon}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.mascotGreen} />
            <Text style={styles.cardTitle}>My Schedule This Week</Text>
          </View>
          
          {profile.weekOverview && profile.weekOverview.length > 0 ? (
            <View style={styles.weekOverviewRow}>
              {profile.weekOverview.map((day, index) => {
                let iconName = "remove";
                let iconColor = "rgba(255,255,255,0.1)";

                if (day.isCompleted) {
                  iconName = "walk";
                  iconColor = COLORS.primaryOrange;
                } 
                else if (day.isAssigned) {
                  iconName = "walk";
                  iconColor = COLORS.textMuted;
                }

                return (
                  <View key={index} style={styles.dayCol}>
                    <Text style={styles.dayLabel}>{day.dayName.substring(0,2)}</Text>
                    <View style={styles.iconWrapper}>
                      <Ionicons name={iconName} size={20} color={iconColor} />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.placeholderText}>
              No schedule available yet. Join a Crew to start running!
            </Text>
          )}
        </View>

        {/* STATS ROOSTER */}
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.minutesContributed}m</Text>
            <Text style={styles.statLabel}>Contributed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.totalRuns}</Text>
            <Text style={styles.statLabel}>Total Runs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>🔥 {profile.highestStreak}</Text>
            <Text style={styles.statLabel}>Highest Streak</Text>
          </View>
        </View>

        {/* 🚀 DYNAMISCHE ACHIEVEMENTS */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.badgeRow}>
          
          {/* Founder Badge (Altijd unlocked) */}
          <View style={styles.badgeItem}>
            <View style={[styles.badgeIconCircle, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
              <Ionicons name="trophy" size={24} color={COLORS.secondaryYellow} />
            </View>
            <Text style={styles.badgeLabel}>Founder</Text>
          </View>

          {/* First Run Badge */}
          <View style={[styles.badgeItem, profile.totalRuns < 1 && { opacity: 0.4 }]}>
            <View style={[
              styles.badgeIconCircle, 
              { backgroundColor: profile.totalRuns >= 1 ? 'transparent' : '#3a3f58' }
            ]}>
              {profile.totalRuns >= 1 ? (
                <Image 
                  source={require('../../assets/images/badge-first-run.png')} 
                  style={{ width: 48, height: 48, resizeMode: 'contain' }}
                />
              ) : (
                <Ionicons 
                  name="lock-closed" 
                  size={24} 
                  color={COLORS.textMuted} 
                />
              )}
            </View>
            <Text style={styles.badgeLabel}>First Run</Text>
          </View>

          {/* 10 Streak Badge */}
          <View style={[styles.badgeItem, profile.highestStreak < 10 && { opacity: 0.4 }]}>
            <View style={[
              styles.badgeIconCircle, 
              { backgroundColor: profile.highestStreak >= 10 ? 'rgba(231, 84, 56, 0.1)' : '#3a3f58' }
            ]}>
              <Ionicons 
                name={profile.highestStreak >= 10 ? "flash" : "lock-closed"} 
                size={24} 
                color={profile.highestStreak >= 10 ? COLORS.primaryOrange : COLORS.textMuted} 
              />
            </View>
            <Text style={styles.badgeLabel}>10 Streak</Text>
          </View>

        </View>

        {/* LOG OUT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginTop: 20, marginBottom: 25 },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, position: 'relative', marginBottom: 15 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primaryOrange, justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { color: '#FFF', fontFamily: 'Baloo-Bold', fontSize: 42, marginTop: 5 },
  editCameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.cardBackground, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.background },
  profileName: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 28, textTransform: 'capitalize', marginBottom: 4 },
  crewTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  crewTagText: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 13 },
  crewHighlight: { color: COLORS.textLight, fontWeight: '600' },
  card: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 18, marginBottom: 15 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardTitle: { color: COLORS.textMuted, fontFamily: 'Inter', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 8 },
  editGoalBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  editGoalText: { color: COLORS.secondaryYellow, fontFamily: 'Inter', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
  goalText: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 22 },
  placeholderText: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 20, marginTop: 15, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { backgroundColor: COLORS.cardBackground, flex: 1, marginRight: 10, borderRadius: 16, padding: 15, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 20, marginBottom: 2 },
  statLabel: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 11, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 15, justifyContent: 'space-around' },
  badgeItem: { alignItems: 'center', width: 70 },
  badgeIconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  badgeLabel: { color: COLORS.textLight, fontFamily: 'Inter', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 35, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255, 107, 107, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.15)' },
  logoutText: { color: '#FF6B6B', fontFamily: 'Inter', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
  weekOverviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  dayCol: { alignItems: 'center' },
  dayLabel: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' },
  iconWrapper: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' }
});