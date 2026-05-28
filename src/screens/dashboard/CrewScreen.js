// src/screens/main/CrewScreen.js
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Share, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import * as WebBrowser from "expo-web-browser";
import { useAuthRequest, makeRedirectUri } from "expo-auth-session";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../lib/supabase";
import { ensureFourteenDaySchedule, processNachtCheck } from "../../services/streakService";

WebBrowser.maybeCompleteAuthSession();

const stravaEndpoints = {
  authorizationEndpoint: "https://www.strava.com/oauth/mobile/authorize",
  tokenEndpoint: "https://www.strava.com/oauth/token",
};

export default function CrewScreen({ navigation }) {
  // --- 1. USER CONTEXT & STATES ---
  const { crewData, loading: userLoading, refreshCrewData } = useUser();

  // Activity log states
  const [activities, setActivities] = useState([]);

  // Streak Engine states
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [weekAssignments, setWeekAssignments] = useState([]);
  const [todayAssignment, setTodayAssignment] = useState(null);
  const [batonHolderNames, setBatonHolderNames] = useState("");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isWeekModalVisible, setWeekModalVisible] = useState(false);
  const [crewProfiles, setCrewProfiles] = useState({});

  // --- 2. DE COUNTDOWN TIMER ---
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tonight = new Date();
      tonight.setHours(23, 59, 59, 999);
      const diffMs = tonight - now;

      if (diffMs <= 0) {
        setTimeRemaining("Time's up!");
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const pad = (num) => String(num).padStart(2, "0");
      setTimeRemaining(`${pad(hours)}:${pad(minutes)}:${pad(seconds)} remaining`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- 3. DATA OPHALEN & STREAK ENGINE ---
  const fetchActivityLog = async () => {
    if (!crewData?.id) return;
    const { data } = await supabase.from("crew_activity_log").select(`id, event_type, metadata, created_at, profiles ( display_name )`).eq("crew_id", crewData.id).order("created_at", { ascending: false }).limit(5);

    if (data) setActivities(data);
  };

  const initStreakEngine = async () => {
    if (!crewData?.id) {
      setScheduleLoading(false);
      return;
    }
    try {
      setScheduleLoading(true);

      // A. Controleer de acties van gisteren
      await processNachtCheck(crewData.id);

      // B. Zorg dat de komende 14 dagen zijn ingepland in de database
      await ensureFourteenDaySchedule(crewData.id);

      // C. Haal alle profielen op om ID's naar echte namen te vertalen
      const { data: profilesData } = await supabase.from("crew_members").select("user_id, profiles(display_name)").eq("crew_id", crewData.id);

      const profileMap = {};
      if (profilesData) {
        profilesData.forEach((p) => {
          profileMap[p.user_id] = p.profiles?.display_name || "Loper";
        });
        setCrewProfiles(profileMap);
      }

      // D. Bepaal EXACT de maandag van deze week, en de zondag van volgende week
      const getLocalYYYYMMDD = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d - offset).toISOString().split("T")[0];
      };

      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Zondag is 0 in JS

      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() - daysSinceMonday);
      const mondayStr = getLocalYYYYMMDD(thisMonday);

      const nextSunday = new Date(thisMonday);
      nextSunday.setDate(thisMonday.getDate() + 13);
      const nextSundayStr = getLocalYYYYMMDD(nextSunday);

      const { data: assignments } = await supabase.from("crew_daily_assignments").select("*").eq("crew_id", crewData.id).gte("assignment_date", mondayStr).lte("assignment_date", nextSundayStr).order("assignment_date", { ascending: true });

      if (assignments && assignments.length > 0) {
        setWeekAssignments(assignments);

        // Omdat de lijst nu altijd op maandag begint, moeten we 'vandaag' even opzoeken in de lijst!
        const todayStr = getLocalYYYYMMDD(new Date());
        const todayData = assignments.find((a) => a.assignment_date === todayStr);

        setTodayAssignment(todayData || null);

        if (todayData?.is_rest_day) {
          setBatonHolderNames("Rest Day ❄️");
        } else if (todayData?.assigned_users?.length > 0) {
          const names = todayData.assigned_users.map((id) => profileMap[id] || "Ex-Crew member").join(" & ");
          setBatonHolderNames(names);
        } else {
          setBatonHolderNames("Niemand aangeduid");
        }
      }
    } catch (err) {
      console.error("Fout in Streak Engine:", err);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      refreshCrewData();
      fetchActivityLog();
      initStreakEngine();
    });
    fetchActivityLog();
    initStreakEngine();
    return unsubscribe;
  }, [navigation, crewData?.id]);

  // --- 4. STRAVA LOGICA ---
  const clientId = "239284";
  const clientSecret = "60200fc0f94bb76d5459359f3dbda3eb2b923b0d";
  const redirectUri = makeRedirectUri();

  const [request, response, promptAsync] = useAuthRequest({ clientId, scopes: ["activity:read_all"], usePKCE: false, redirectUri }, stravaEndpoints);

  useEffect(() => {
    if (response?.type === "success") {
      fetchToken(response.params.code);
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
      if (data.access_token) fetchStravaActivities(data.access_token);
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
      case "run_uploaded":
        return (
          <Text>
            {name} <Text style={styles.activityAction}>completed a run of </Text>
            <Text style={styles.activityHighlight}>{item.metadata?.duration_minutes || 0}min</Text>
          </Text>
        );
      case "member_joined":
        return (
          <Text>
            {name} <Text style={styles.activityAction}>joined the Crew! 👋</Text>
          </Text>
        );
      case "member_left":
        return (
          <Text>
            {item.metadata?.ex_member_name || "A member"} <Text style={styles.activityAction}>left the Crew.</Text>
          </Text>
        );
      case "streak_broken":
        return (
          <Text>
            💥 Oh no! <Text style={styles.activityAction}>The relay streak was broken.</Text>
          </Text>
        );
      case "rest_day_used":
        return (
          <Text>
            🛡️ A Rest Day Token <Text style={styles.activityAction}>was deployed to save the streak!</Text>
          </Text>
        );
      default:
        return <Text>Something happened in the crew.</Text>;
    }
  };

  // --- 5. UI RENDER ---
  if ((userLoading && !crewData) || scheduleLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrange} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* HEADER */}
      <View style={styles.header}>
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
        </View>
      </View>

      {/* STREAK BANNER */}
      <View style={styles.streakBanner}>
        <Ionicons name="flame" size={32} color={COLORS.primaryOrange} style={styles.streakIcon} />
        <View style={styles.streakTextContainer}>
          <Text style={styles.streakTitle}>
            Relay streak: {crewData?.current_streak || 0} {crewData?.current_streak === 1 ? "Day" : "Days"}! 🔥
          </Text>
          <Text style={styles.streakSubtitle}>{crewData?.rest_day_tokens || 0} Rest Day Tokens over 🛡️</Text>
        </View>
      </View>

      {/* BATON HOLDER CARD */}
      <TouchableOpacity style={styles.batonCard} activeOpacity={0.8} onPress={() => setWeekModalVisible(true)}>
        <View style={styles.batonHeader}>
          <Text style={styles.batonTitle}>Today's Baton Holder</Text>
          <Text style={styles.viewWeekText}>View Week &gt;</Text>
        </View>

        <View style={styles.batonMain}>
          <View style={[styles.largeAvatar, { backgroundColor: todayAssignment?.status === "completed" ? COLORS.mascotGreen : todayAssignment?.is_rest_day ? "#3498db" : COLORS.primaryOrange }]}>
            <Ionicons name={todayAssignment?.status === "completed" ? "checkmark-circle" : todayAssignment?.is_rest_day ? "snow" : "walk"} size={30} color="#FFF" />
          </View>
          <View style={styles.batonInfo}>
            <Text style={styles.batonName} numberOfLines={1}>
              {batonHolderNames}
            </Text>
            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={16} color={todayAssignment?.status === "completed" ? COLORS.mascotGreen : COLORS.primaryOrange} />
              <Text style={[styles.timerText, todayAssignment?.status === "completed" ? { color: COLORS.mascotGreen } : null]}>
                {todayAssignment?.status === "completed" ? "Streak secured for today! 🎉" : todayAssignment?.is_rest_day ? "Enjoy your rest day! ❄️" : timeRemaining}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* WEEKOVERZICHT MODAL */}
      <Modal visible={isWeekModalVisible} animationType="slide" transparent={true} onRequestClose={() => setWeekModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crew Relay Schedule</Text>
              <TouchableOpacity onPress={() => setWeekModalVisible(false)}>
                <Ionicons name="close-circle" size={32} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.weekList} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              {weekAssignments.map((day, index) => {
                // Tijdzone-veilige omzetting van de oprichtingsdatum
                const getLocalYYYYMMDD = (isoString) => {
                  if (!isoString) return "1970-01-01";
                  const d = new Date(isoString);
                  const offset = d.getTimezoneOffset() * 60000;
                  return new Date(d - offset).toISOString().split("T")[0];
                };

                const crewCreatedAtStr = getLocalYYYYMMDD(crewData?.created_at);
                const isBeforeCreation = day.assignment_date < crewCreatedAtStr;
                const dayDate = new Date(day.assignment_date);
                const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });

                const offset = new Date().getTimezoneOffset() * 60000;
                const todayStr = new Date(new Date() - offset).toISOString().split("T")[0];
                const isToday = day.assignment_date === todayStr;

                const isFirstDayThisWeek = index === 0;
                const isFirstDayNextWeek = index === 7;

                // --- DE STATUS EN ICOON LOGICA ---
                let dayStatusColor = COLORS.textMuted;
                let dayIcon = "ellipse-outline";
                let lopers = "";

                if (isBeforeCreation) {
                  // 1. Crew bestond nog niet
                  dayStatusColor = "#475569";
                  dayIcon = "remove-circle-outline";
                  lopers = "    Crew not formed yet";
                } else if (day.status === "completed") {
                  // 2. Goal is complete! Groen vinkje
                  dayStatusColor = COLORS.mascotGreen;
                  dayIcon = "checkmark-circle";
                  lopers = day.is_rest_day
                    ? "Rest Day completed! ❄️"
                    : (day.assigned_users?.map((id) => crewProfiles[id]).join(" & ") || "Goal achieved!");
                } else if (day.status === "failed") {
                  // 3. Goal is gefaald (rood kruis)
                  dayStatusColor = "#e74c3c";
                  dayIcon = "close-circle";
                  lopers = day.is_rest_day 
                    ? "Rest Day" 
                    : (day.assigned_users?.map((id) => crewProfiles[id]).join(" & ") || "Failed");
                } else if (day.status === "saved_by_token") {
                  // 4. Gered door een nood-token
                  dayStatusColor = COLORS.secondaryYellow;
                  dayIcon = "shield-checkmark";
                  lopers = "Streak saved! 🛡️";
                } else {
                  // 5. Dag is nog in afwachting (pending)
                  if (day.is_rest_day) {
                    dayStatusColor = "#3498db";
                    dayIcon = "snow";
                    lopers = "Rest Day ❄️";
                  } else {
                    dayStatusColor = isToday ? COLORS.primaryOrange : COLORS.textMuted;
                    dayIcon = isToday ? "walk" : "ellipse-outline";
                    lopers = day.assigned_users?.map((id) => crewProfiles[id]).join(" & ") || "No runners";
                  }
                }

                return (
                  <React.Fragment key={index}>
                    {isFirstDayThisWeek && <Text style={[styles.sectionDivider, { marginTop: 0 }]}>This Week</Text>}
                    {isFirstDayNextWeek && <Text style={styles.sectionDivider}>Next Week</Text>}

                    <View style={[styles.weekRow, isToday ? styles.todayRow : styles.standardRow]}>
                      <View style={styles.weekDayCol}>
                        <Text style={[styles.weekDayText, isToday ? { color: COLORS.secondaryYellow } : isBeforeCreation ? { color: "#475569" } : null]}>{dayName}</Text>
                      </View>
                      <View style={styles.weekIconCol}>
                        <Ionicons name={dayIcon} size={24} color={dayStatusColor} />
                      </View>
                      <View style={styles.weekNameCol}>
                        <Text style={[styles.weekRunnerText, isBeforeCreation ? { color: "#475569", fontStyle: "italic" } : null]} numberOfLines={1}>
                          {lopers}
                        </Text>
                      </View>
                      {isToday && !isBeforeCreation && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>Today</Text>
                        </View>
                      )}
                    </View>
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* STRAVA SYNC BUTTON */}
      <TouchableOpacity style={[styles.stravaButton, !request ? { opacity: 0.5 } : {}]} activeOpacity={0.8} disabled={!request} onPress={() => promptAsync()}>
        <Ionicons name="fitness" size={24} color="#FFF" style={{ marginRight: 10 }} />
        <Text style={styles.stravaButtonText}>Sync run from Strava</Text>
      </TouchableOpacity>

      {/* RECENT ACTIVITY */}
      <View style={styles.activitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>

        {activities.length === 0 ? (
          <Text style={{ color: COLORS.textMuted, fontFamily: "Inter", fontStyle: "italic" }}>No recent activity yet. Go for a run!</Text>
        ) : (
          activities.map((item) => {
            let avatarColor = COLORS.primaryOrange;
            let iconName = "footsteps";
            if (item.event_type === "member_joined") {
              avatarColor = COLORS.mascotGreen;
              iconName = "person-add";
            }
            if (item.event_type === "member_left") {
              avatarColor = "#e74c3c";
              iconName = "person-remove";
            }
            if (item.event_type === "rest_day_used") {
              avatarColor = COLORS.secondaryYellow;
              iconName = "shield";
            }
            if (item.event_type === "streak_broken") {
              avatarColor = "#7f8c8d";
              iconName = "flash-off";
            }

            return (
              <View key={item.id} style={styles.activityItem}>
                <View style={[styles.smallAvatar, { backgroundColor: avatarColor }]}>
                  <Ionicons name={iconName} size={16} color="#FFF" />
                </View>
                <View style={styles.activityDetails}>
                  <Text style={styles.activityUser}>{renderActivityText(item)}</Text>
                  <Text style={styles.activityMeta}>{formatRelativeTime(item.created_at)}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" },
  contentContainer: { padding: 20, paddingBottom: 40 },
  header: { marginTop: 50, marginBottom: 30, alignItems: "center", position: "relative", width: "100%" },
  settingsButtonRight: { position: "absolute", top: 0, right: 0, padding: 5, zIndex: 10 },
  crewTitle: { fontSize: 36, fontFamily: "Baloo-Bold", color: COLORS.textLight, marginBottom: 10, textTransform: "capitalize" },
  crewMembersContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: COLORS.background },
  avatarText: { color: "#FFF", fontSize: 14, fontWeight: "bold" },
  streakBanner: { flexDirection: "row", backgroundColor: "rgba(231, 84, 56, 0.1)", borderWidth: 1, borderColor: "rgba(231, 84, 56, 0.3)", borderRadius: 16, padding: 15, alignItems: "center", marginBottom: 25 },
  streakIcon: { marginRight: 15 },
  streakTextContainer: { flex: 1 },
  streakTitle: { color: COLORS.primaryOrange, fontFamily: "Inter", fontWeight: "bold", fontSize: 18, marginBottom: 2 },
  streakSubtitle: { color: COLORS.textLight, fontFamily: "Inter", fontSize: 14 },
  batonCard: { backgroundColor: COLORS.cardBackground, borderRadius: 20, padding: 20, marginBottom: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  batonHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  batonTitle: { color: COLORS.textMuted, fontFamily: "Inter", fontWeight: "bold", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 },
  batonMain: { flexDirection: "row", alignItems: "center" },
  largeAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginRight: 15 },
  largeAvatarText: { color: "#FFF", fontSize: 24, fontWeight: "bold" },
  batonInfo: { flex: 1 },
  batonName: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 24, marginBottom: 4 },
  timerRow: { flexDirection: "row", alignItems: "center" },
  timerText: { color: COLORS.primaryOrange, fontFamily: "Inter", fontWeight: "bold", fontSize: 14, marginLeft: 6 },
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
  stravaButtonText: { color: "#FFF", fontFamily: "Inter", fontWeight: "bold", fontSize: 16 },
  activitySection: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sectionTitle: { fontSize: 22, fontFamily: "Baloo-Bold", color: COLORS.textLight },
  activityItem: { flexDirection: "row", alignItems: "center", marginBottom: 15, backgroundColor: "rgba(38, 42, 62, 0.5)", padding: 12, borderRadius: 12 },
  smallAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 15 },
  activityDetails: { flex: 1 },
  activityUser: { color: COLORS.textLight, fontFamily: "Inter", fontWeight: "bold", fontSize: 15, marginBottom: 2 },
  activityAction: { fontWeight: "normal", color: "#cbd5e1" },
  activityMeta: { color: COLORS.textMuted, fontFamily: "Inter", fontSize: 12 },
  activityHighlight: { color: COLORS.secondaryYellow, fontFamily: "Baloo-Bold", fontSize: 16 },

  // Modal & Extra Styles
  viewWeekText: { color: COLORS.secondaryYellow, fontFamily: "Inter", fontSize: 12, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.cardBackground, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 24, fontFamily: "Baloo-Bold", color: COLORS.textLight },
  weekList: { marginBottom: 20 },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  sectionDivider: {
    color: COLORS.textLight,
    fontFamily: "Baloo-Bold",
    fontSize: 20,
    marginTop: 25,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingBottom: 5,
  },
  standardRow: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  todayRow: {
    borderWidth: 1.5,
    borderColor: COLORS.secondaryYellow,
    borderRadius: 12,
    backgroundColor: "rgba(249, 212, 35, 0.08)",
    paddingHorizontal: 15,
    marginVertical: 6,
  },
  todayBadge: {
    backgroundColor: COLORS.secondaryYellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayBadgeText: {
    color: COLORS.background,
    fontFamily: "Inter",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  weekDayCol: { width: 60 },
  weekDayText: { color: COLORS.textMuted, fontFamily: "Inter", fontWeight: "bold", textTransform: "uppercase" },
  weekIconCol: { width: 40, alignItems: "center" },
  weekNameCol: { flex: 1, paddingLeft: 10 },
  weekRunnerText: { color: COLORS.textLight, fontFamily: "Inter", fontSize: 16, fontWeight: "600" },
});