// src/screens/dashboard/CrewSettingsScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, FlatList, Share, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useUser } from '../../context/UserContext';
import { recalculateFutureSchedule } from "../../services/streakService";
import { supabase } from '../../lib/supabase';


export default function CrewSettingsScreen({ navigation }) {
  const { crewData, refreshCrewData } = useUser();
  const [isPublic, setIsPublic] = useState(false); 
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // We houden lokaal bij of de ingelogde user de leider is
  const [isLocalAdmin, setIsLocalAdmin] = useState(false);

  // States voor het bewerken van de crew naam
  const [localCrewName, setLocalCrewName] = useState(crewData?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);

  const MAX_MEMBERS = 5; 
  const isCrewFull = members.length >= MAX_MEMBERS;

  const fetchRealMembers = async () => {
    if (!crewData?.id) return;

    try {
      // 1. Haal de huidige ingelogde user op
      const { data: { user } } = await supabase.auth.getUser();
      let activeUid = null;
      if (user) {
        setCurrentUserId(user.id);
        activeUid = user.id;
      }

      // 2. Haal de crewleden op (zonder te sorteren op created_at!)
      const { data, error } = await supabase
        .from('crew_members')
        .select(`
          user_id,
          profiles ( display_name )
        `)
        .eq('crew_id', crewData.id);

      if (error) console.error("Supabase Error:", error.message);

      if (data && data.length > 0) {
        // 💡 DE WATERDICHTE TRIGGER: De allereerste rij die ooit is aangemaakt is de Oprichter!
        const absoluteLeaderId = data[0].user_id;
        
        // Als jij de oprichter bent, krijg je per direct admin rechten
        if (activeUid === absoluteLeaderId) {
          setIsLocalAdmin(true);
        } else {
          setIsLocalAdmin(false); // Zorg dat een 2e lid expliciet géén admin wordt
        }

        const formattedMembers = data.map(m => {
          const displayName = m.profiles?.display_name || "Unknown Runner"; 
          const isLeader = m.user_id === absoluteLeaderId; 

          return {
            id: m.user_id,
            name: displayName,
            role: isLeader ? 'Leader' : 'Runner', 
            initial: displayName.charAt(0).toUpperCase(),
            color: isLeader ? COLORS.primaryOrange : COLORS.mascotGreen
          };
        });
        
        setMembers(formattedMembers);
      }
    } catch (err) {
      console.error("Fout bij ophalen leden:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchRealMembers();
  }, [crewData]);

  const askConfirmNameUpdate = () => {
    if (localCrewName.trim() === "" || localCrewName.trim() === crewData?.name) {
      setIsEditingName(false);
      setLocalCrewName(crewData?.name || "");
      return;
    }

    Alert.alert(
      "Confirm Name Change",
      `Are you sure you want to change the crew name to "${localCrewName}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setIsEditingName(false);
            setLocalCrewName(crewData?.name || "");
          }
        },
        {
          text: "Confirm",
          onPress: handleUpdateCrewName
        }
      ]
    );
  };

  const handleUpdateCrewName = async () => {
    try {
      await supabase
        .from('crews')
        .update({ name: localCrewName })
        .eq('id', crewData.id);
      
      setIsEditingName(false);
      refreshCrewData(); 
    } catch (error) {
      console.error("Fout bij updaten naam:", error.message);
      Alert.alert("Error", "Could not update crew name.");
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my running crew "${crewData?.name}" on MyPace! Use my invite code: ${crewData?.invite_code}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

const handleLeaveCrew = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const myMemberRecord = members.find(m => m.id === user.id);
      const myName = myMemberRecord?.name || "A member";

      // 1. Verwijder jezelf uit de crew_members tabel
      await supabase.from("crew_members").delete().eq("user_id", user.id);

      // 2. Log de actie in de activity feed
      await supabase.from("crew_activity_log").insert({
        crew_id: crewData.id,
        event_type: "member_left",
        metadata: { ex_member_name: myName }
      });

      // 3. Herbereken de toekomst voor de overgebleven leden!
      await recalculateFutureSchedule(crewData.id);

      // 4. Sluit dit settings scherm ONMIDDELLIJK af
      navigation.goBack(); 

      // 5. Maak de lokaal opgeslagen crew leeg (dit triggert de empty states op de onderliggende schermen!)
      refreshCrewData(); 

    } catch (error) {
      console.error("Fout bij verlaten:", error);
    }
  };

  const removeMember = async (userId, name) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${name} from the crew?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            setMembers(members.filter(m => m.id !== userId));
            try {
              await supabase.from('crew_members').delete().eq('user_id', userId).eq('crew_id', crewData.id);
              await supabase.from('crew_activity_log').insert({
                crew_id: crewData.id,
                event_type: 'member_left',
                metadata: { ex_member_name: name }
              });
              await recalculateFutureSchedule(crewData.id);
              fetchRealMembers(); 
            } catch (error) {
              console.error(error);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crew Management</Text>
        <View style={{ width: 28 }} /> 
      </View>

      {/* CREW NAAM EDIT SECTIE */}
      <View style={styles.crewNameSection}>
        {isEditingName && isLocalAdmin ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.nameInput}
              value={localCrewName}
              onChangeText={setLocalCrewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={askConfirmNameUpdate}
            />
          </View>
        ) : (
          <View style={styles.displayNameRow}>
            <Text style={styles.crewNameText}>{crewData?.name}</Text>
            {isLocalAdmin && (
              <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editBtn}>
                <Ionicons name="create-outline" size={22} color={COLORS.secondaryYellow} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* PUBLIC TOGGLE */}
      {isLocalAdmin && !isCrewFull && (
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
        <Text style={styles.memberCount}>{members.length}/{MAX_MEMBERS}</Text>
      </View>

      {loadingMembers ? (
        <ActivityIndicator color={COLORS.primaryOrange} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberItem}>
              <View style={[styles.avatar, { backgroundColor: item.color }]}>
                <Text style={styles.avatarText}>{item.initial}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {item.name} {item.id === currentUserId && "(You)"}
                </Text>
                <Text style={styles.memberRole}>{item.role}</Text>
              </View>
              
              {isLocalAdmin && item.id !== currentUserId && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeMember(item.id, item.name)}>
                  <Ionicons name="person-remove-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
      <View style={styles.leaveBtn}>
                  <TouchableOpacity onPress={handleLeaveCrew} style={styles.leaveButton}>
                    <Text style={styles.leaveText}>Leave Crew</Text>
                  </TouchableOpacity>
              </View>

      {/* INLINE INVITE BAR ONDERAAN */}
      {!isCrewFull && crewData?.invite_code && (
        <View style={styles.cleanCodeContainer}>
          <Text style={styles.cleanCodeText}>
            Invite code: <Text style={styles.codeHighlight}>{crewData.invite_code}</Text>
          </Text>
          
          <TouchableOpacity style={styles.shareInlineBtn} onPress={handleShare} activeOpacity={0.6}>
            <Ionicons name="share-social-outline" size={18} color={COLORS.secondaryYellow} />
            <Text style={styles.shareInlineText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  iconBtn: { padding: 5 },
  headerTitle: { color: COLORS.textMuted, fontFamily: 'Inter', fontWeight: '600', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
  crewNameSection: { paddingHorizontal: 40, marginVertical: 10, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  displayNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  crewNameText: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 32, textTransform: 'capitalize', textAlign: 'center' },
  editBtn: { position: 'absolute', right: -30, padding: 5 },
  editNameRow: { flexDirection: 'row', width: '100%', alignItems: 'center', backgroundColor: COLORS.cardBackground, borderRadius: 16, paddingHorizontal: 15 },
  nameInput: { flex: 1, color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 24, paddingVertical: 10, textAlign: 'center' },
  settingCard: { backgroundColor: COLORS.cardBackground, marginHorizontal: 20, padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25, marginTop: 10 },
  settingText: { flex: 1, paddingRight: 15 },
  settingTitle: { color: COLORS.textLight, fontFamily: 'Inter', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  settingSub: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15, marginTop: 10 },
  listTitle: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 22 },
  memberCount: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 16, fontWeight: 'bold' },
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  memberInfo: { flex: 1 },
  memberName: { color: COLORS.textLight, fontFamily: 'Inter', fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  memberRole: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 12 },
  removeBtn: { padding: 10, backgroundColor: 'rgba(255, 107, 107, 0.1)', borderRadius: 12 },
  cleanCodeContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', marginTop: 'auto', marginBottom: 10 },
  cleanCodeText: { color: COLORS.textMuted, fontFamily: 'Inter', fontSize: 16 },
  codeHighlight: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 18, letterSpacing: 1 },
  shareInlineBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 15, backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)' },
  shareInlineText: { color: COLORS.secondaryYellow, fontFamily: 'Inter', fontWeight: 'bold', fontSize: 13, marginLeft: 5 },
  leaveBtn: { height: 40, justifyContent: "center", marginTop: 10 },
  leaveButton: { width: '40%', paddingVertical: 10, paddingHorizontal: 20, alignSelf: "center", backgroundColor: 'rgba(255, 107, 107, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.2)', bottom: 10 },
  leaveText: { fontSize: 16, fontFamily: "Inter", fontWeight: "600", color: COLORS.primaryOrange, alignSelf: "center" },
});