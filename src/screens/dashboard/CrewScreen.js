// src/screens/main/CrewScreen.js
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import * as WebBrowser from "expo-web-browser";
import { useAuthRequest, makeRedirectUri } from "expo-auth-session";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const stravaEndpoints = {
  authorizationEndpoint: "https://www.strava.com/oauth/mobile/authorize",
  tokenEndpoint: "https://www.strava.com/oauth/token",
};

export default function CrewScreen({ navigation }) {
  // --- 1. USER CONTEXT (Data uit de cloud) ---
  const { crewData, loading, refreshCrewData } = useUser();
  const [activities, setActivities] = useState([]);

  const fetchActivityLog = async () => {
    if (!crewData?.id) return;

    const { data, error } = await supabase
      .from("crew_activity_log")
      .select(
        `
      id,
      event_type,
      metadata,
      created_at,
      profiles ( display_name )
    `,
      )
      .eq("crew_id", crewData.id)
      .order("created_at", { ascending: false })
      .limit(5); // Pak alleen de 5 nieuwste

    if (data) setActivities(data);
  };

  // Voeg fetchActivityLog toe aan je bestaande focus-listener useEffect
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      refreshCrewData();
      fetchActivityLog();
    });
    fetchActivityLog();
    return unsubscribe;
  }, [navigation, crewData?.id]);

  // --- 2. STRAVA LOGICA ---
  const clientId = "239284"; // Jouw Strava Client ID
  const clientSecret = "60200fc0f94bb76d5459359f3dbda3eb2b923b0d"; // Jouw Strava Secret

  const redirectUri = makeRedirectUri();

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: clientId,
      scopes: ["activity:read_all"],
      usePKCE: false,
      redirectUri: redirectUri,
    },
    stravaEndpoints,
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      console.log("Strava code ontvangen. Inruilen voor token...");
      fetchToken(code);
    }
  }, [response]);

  const fetchToken = async (code) => {
    try {
      const res = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: "authorization_code",
        }),
      });

      const data = await res.json();
      if (data.access_token) {
        fetchStravaActivities(data.access_token);
      }
    } catch (error) {
      console.error("Fout bij ophalen van token:", error);
    }
  };

  const fetchStravaActivities = async (accessToken) => {
    try {
      const FilterDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
      const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${FilterDaysAgo}&per_page=30`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const allActivities = await res.json();
      const allowedTypes = ["Run", "TrailRun", "VirtualRun"];
      const filteredRuns = allActivities.filter((activity) => allowedTypes.includes(activity.type));

      navigation.navigate("StravaSync", { runs: filteredRuns });
    } catch (error) {
      console.error("Fout bij ophalen van runs:", error);
    }
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join my running crew "${crewData?.name}" on MyPace! Use my invite code: ${crewData?.invite_code}`,
      });
    } catch (error) {
      console.error("Fout bij delen:", error);
    }
  };

  const formatRelativeTime = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const renderActivityText = (item) => {
  const name = item.profiles?.display_name || "Someone";
  
  switch (item.event_type) {
    case 'run_uploaded':
      return (
        <Text>
          {name} <Text style={styles.activityAction}>completed a run of </Text>
          {/* HIER ZIT DE MAGIE: Een specifieke stijl voor de afstand! */}
          <Text style={styles.activityHighlight}>{item.metadata?.distance_km || 0}km</Text>
        </Text>
      );
    case 'member_joined':
      return <Text>{name} <Text style={styles.activityAction}>joined the Crew! 👋</Text></Text>;
    case 'member_left':
      return <Text>{item.metadata?.ex_member_name || 'A member'} <Text style={styles.activityAction}>left the Crew.</Text></Text>;
    case 'streak_broken':
      return <Text>💥 Oh no! <Text style={styles.activityAction}>The relay streak was broken.</Text></Text>;
    case 'rest_day_used':
      return <Text>🛡️ A Rest Day Token <Text style={styles.activityAction}>was deployed to save the streak!</Text></Text>;
    default:
      return <Text>Something happened in the crew.</Text>;
  }
};

  // --- 3. LOADING STATE ---
  // Toon een subtiel laadscherm als we nog écht geen data hebben
  if (loading && !crewData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrange} />
      </View>
    );
  }

  // --- 4. UI ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* HEADER */}
      <View style={styles.header}>
        {/* NIEUW: De Settings knop zwevend in de rechterbovenhoek */}
        <TouchableOpacity style={styles.settingsButtonRight} activeOpacity={0.7} onPress={() => navigation.navigate("CrewSettings")}>
          <Ionicons name="settings-outline" size={28} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={styles.crewTitle}>{crewData?.name || "Geen Crew"}</Text>

        <View style={styles.crewMembersContainer}>
          <View style={[styles.avatar, { backgroundColor: COLORS.primaryOrange }]}>
            <Text style={styles.avatarText}>J</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: COLORS.mascotGreen, marginLeft: -15 }]}>
            <Text style={styles.avatarText}>S</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: COLORS.secondaryYellow, marginLeft: -15 }]}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: "#3498db", marginLeft: -15 }]}>
            <Text style={styles.avatarText}>L</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: "#e74c3c", marginLeft: -15 }]}>
            <Text style={styles.avatarText}>R</Text>
          </View>
          {/* Het overlappende tandwieltje is hier nu weg! */}
        </View>
      </View>

      {/* STREAK BANNER */}
      <View style={styles.streakBanner}>
        <Ionicons name="flame" size={32} color={COLORS.primaryOrange} style={styles.streakIcon} />
        <View style={styles.streakTextContainer}>
          <Text style={styles.streakTitle}>Relay streak: Actief!</Text>
          <Text style={styles.streakSubtitle}>{crewData?.total_minutes || 0} minuten totaal gerend.</Text>
        </View>
      </View>

      {/* BATON HOLDER CARD */}
      <TouchableOpacity style={styles.batonCard} activeOpacity={0.8} onPress={() => console.log("Baton details openen...")}>
        <View style={styles.batonHeader}>
          <Text style={styles.batonTitle}>Today's Baton Holder</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>

        <View style={styles.batonMain}>
          <View style={[styles.largeAvatar, { backgroundColor: "#519378" }]}>
            <Text style={styles.largeAvatarText}>S</Text>
          </View>
          <View style={styles.batonInfo}>
            <Text style={styles.batonName}>Sarah</Text>
            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.primaryOrange} />
              <Text style={styles.timerText}>10:44:15 remaining</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* STRAVA SYNC BUTTON */}
      <TouchableOpacity style={[styles.stravaButton, !request ? { opacity: 0.5 } : {}]} activeOpacity={0.8} disabled={!request} onPress={() => promptAsync()}>
        <Ionicons name="fitness" size={24} color="#FFF" style={{ marginRight: 10 }} />
        <Text style={styles.stravaButtonText}>Sync run from Strava</Text>
      </TouchableOpacity>

      {/* RECENT ACTIVITY */}
      <View style={styles.activitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.viewMoreText}>View more &gt;</Text>
          </TouchableOpacity>
        </View>

        {activities.length === 0 ? (
          <Text style={{ color: COLORS.textMuted, fontFamily: "Inter", fontStyle: "italic" }}>
            No recent activity yet. Go for a run!
          </Text>
        ) : (
          activities.map((item) => {
            // Geef elk type event een eigen kleur avatar
            let avatarColor = COLORS.primaryOrange;
            let iconName = "footsteps";
            if (item.event_type === 'member_joined') { avatarColor = COLORS.mascotGreen; iconName = "person-add"; }
            if (item.event_type === 'member_left') { avatarColor = "#e74c3c"; iconName = "person-remove"; }
            if (item.event_type === 'rest_day_used') { avatarColor = COLORS.secondaryYellow; iconName = "shield"; }
            if (item.event_type === 'streak_broken') { avatarColor = "#7f8c8d"; iconName = "flash-off"; }

            return (
              <View key={item.id} style={styles.activityItem}>
                <View style={[styles.smallAvatar, { backgroundColor: avatarColor }]}>
                  <Ionicons name={iconName} size={16} color="#FFF" />
                </View>
                <View style={styles.activityDetails}>
                  <Text style={styles.activityUser}>
                    {renderActivityText(item)}
                  </Text>
                  <Text style={styles.activityMeta}>
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // #191c2f
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 50,
    marginBottom: 30,
    alignItems: "center",
    position: "relative",
    width: "100%",
  },
  settingsButtonRight: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 5,
    zIndex: 10,
  },
  crewTitle: {
    fontSize: 36,
    fontFamily: "Baloo-Bold",
    color: COLORS.textLight,
    marginBottom: 10,
    textTransform: "capitalize",
  },
  crewMembersContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  avatarText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  streakBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(231, 84, 56, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(231, 84, 56, 0.3)",
    borderRadius: 16,
    padding: 15,
    alignItems: "center",
    marginBottom: 25,
  },
  streakIcon: {
    marginRight: 15,
  },
  streakTextContainer: {
    flex: 1,
  },
  streakTitle: {
    color: COLORS.primaryOrange,
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 2,
  },
  streakSubtitle: {
    color: COLORS.textLight,
    fontFamily: "Inter",
    fontSize: 14,
  },
  batonCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  batonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  batonTitle: {
    color: COLORS.textMuted,
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  batonMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  largeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  largeAvatarText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  batonInfo: {
    flex: 1,
  },
  batonName: {
    color: COLORS.textLight,
    fontFamily: "Baloo-Bold",
    fontSize: 24,
    marginBottom: 4,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerText: {
    color: COLORS.primaryOrange,
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 6,
  },
  stravaButton: {
    backgroundColor: "#FC4C02",
    flexDirection: "row",
    borderRadius: 16,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 35,
    shadowColor: "#FC4C02",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  stravaButtonText: {
    color: "#FFF",
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 16,
  },
  activitySection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Baloo-Bold",
    color: COLORS.textLight,
  },
  viewMoreText: {
    color: COLORS.secondaryYellow,
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "bold",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "rgba(38, 42, 62, 0.5)",
    padding: 12,
    borderRadius: 12,
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  smallAvatarText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  activityDetails: {
    flex: 1,
  },
  activityUser: {
    color: COLORS.textLight,
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 2,
  },
  activityAction: {
    fontWeight: "normal",
    color: "#cbd5e1",
  },
  activityMeta: {
    color: COLORS.textMuted,
    fontFamily: "Inter",
    fontSize: 12,
  },
  activityHighlight: {
    color: COLORS.secondaryYellow,
    fontFamily: "Baloo-Bold",
    fontSize: 16,
  },
});
