// src/screens/main/CrewScreen.js
import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, ImageBackground, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";
import * as WebBrowser from "expo-web-browser";
import { useAuthRequest, makeRedirectUri } from "expo-auth-session";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../lib/supabase";
import { ensureFourteenDaySchedule, processNachtCheck } from "../../services/streakService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomButton from "../../components/ui/CustomButton";
import LottieView from "lottie-react-native";

WebBrowser.maybeCompleteAuthSession();

const stravaEndpoints = {
  authorizationEndpoint: "https://www.strava.com/oauth/mobile/authorize",
  tokenEndpoint: "https://www.strava.com/oauth/token",
};

export default function CrewScreen({ navigation }) {
  const streakAnimation = useRef(new Animated.Value(1)).current;

  // --- 1. USER CONTEXT & STATES ---
  const { crewData, loading: userLoading, refreshCrewData } = useUser();
  const [activities, setActivities] = useState([]);

  // Paginering logica
  const ACTIVITIES_PER_PAGE = 5;
  const [activitiesPage, setActivitiesPage] = useState(0);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);

  // Streak Engine states
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [weekAssignments, setWeekAssignments] = useState([]);
  const [todayAssignment, setTodayAssignment] = useState(null);
  const [batonHolderNames, setBatonHolderNames] = useState("");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isWeekModalVisible, setWeekModalVisible] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Crew Profiles voor avatars
  const [crewProfilesMap, setCrewProfilesMap] = useState({});
  const [crewMembersList, setCrewMembersList] = useState([]);

  const buddyAnimationRef = useRef(null);

  useEffect(() => {
    if (!userLoading) {
      setIsFirstLoad(false);
    }
  }, [userLoading]);

  useEffect(() => {
    if (crewData?.current_streak) {
      Animated.sequence([Animated.timing(streakAnimation, { toValue: 1.2, duration: 200, useNativeDriver: true }), Animated.spring(streakAnimation, { toValue: 1, friction: 3, useNativeDriver: true })]).start();
    }
  }, [crewData?.current_streak]);

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

  // --- TYPEWRITER STATES ---
const [showTutorial, setShowTutorial] = useState(false); 
  const tutorialOpacity = useRef(new Animated.Value(0)).current;
  
  const [displayedText, setDisplayedText] = useState("");
  const [isTextFullyTyped, setIsTextFullyTyped] = useState(false);
  const typewriterTimer = useRef(null);
  const exactTextRef = useRef(""); 

  const tutorialText = "Everyone's weekly goal is used to create the relay schedule. On each day, one or more crew members may be assigned to run. Complete your run on your assigned day to keep the streak alive.";

  // ==========================================
  // 🚀 2. CHECK TUTORIAL STATUS BIJ OPSTARTEN
  // ==========================================
  useEffect(() => {
    let timeoutId; 

    const checkTutorialStatus = async () => {
      if (!crewData?.id) return;

      // 🚀 NIEUWE CHECK: Stop hier direct als de streak nog inactief is (0)
      if (crewData.current_streak === 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Unieke sleutel per gebruiker en per crew
      const statusKey = `@schedule_tutorial_seen_${user.id}_${crewData.id}`;
      const hasSeen = await AsyncStorage.getItem(statusKey);

      // 🔥 TEST MODE: Haal de // hieronder weg om de pop-up ALTIJD te tonen als de streak > 0 is:
      // timeoutId = setTimeout(() => openTutorial(), 2000); return;

      if (!hasSeen) {
        // Wacht 2 seconden nadat het scherm is ingeladen (of de streak zojuist actief werd)
        timeoutId = setTimeout(() => {
          openTutorial();
        }, 2000);
      }
    };
    
    checkTutorialStatus();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [crewData?.id, crewData?.current_streak]); // 🚀 current_streak hier is super belangrijk!

  // ==========================================
  // 🚀 3. TYPEWRITER EFFECT LOGICA
  // ==========================================
  useEffect(() => {
    if (showTutorial) {
      setDisplayedText("");
      exactTextRef.current = ""; 
      setIsTextFullyTyped(false);
      
      if (typewriterTimer.current) clearInterval(typewriterTimer.current);

      const textArray = Array.from(tutorialText);
      let index = 0;

      typewriterTimer.current = setInterval(() => {
        if (index < textArray.length) {
          exactTextRef.current += textArray[index]; 
          setDisplayedText(exactTextRef.current);   
          index++;
        } else {
          clearInterval(typewriterTimer.current);
          setIsTextFullyTyped(true); 
        }
      }, 15); 
    }

    return () => {
      if (typewriterTimer.current) clearInterval(typewriterTimer.current);
    };
  }, [showTutorial]);

  // ==========================================
  // 🚀 4. TUTORIAL SLUITEN
  // ==========================================
  const openTutorial = () => {
    setShowTutorial(true);
    Animated.timing(tutorialOpacity, {
      toValue: 1, duration: 300, useNativeDriver: true
    }).start();
  };

  const handleTutorialNext = async () => {
    if (!isTextFullyTyped) return; // Klikken blokkeren tot hij klaar is met typen

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const statusKey = `@schedule_tutorial_seen_${user.id}_${crewData.id}`;
    await AsyncStorage.setItem(statusKey, 'completed');

    Animated.timing(tutorialOpacity, {
      toValue: 0, duration: 200, useNativeDriver: true
    }).start(() => {
      setShowTutorial(false);
    });
  };

// 🚀 Start de animatie als de pop-up opent, pauzeer hem zodra de tekst af is
  useEffect(() => {
    if (buddyAnimationRef.current) {
      if (showTutorial && !isTextFullyTyped) {
        buddyAnimationRef.current.play();
      } else {
        // Zodra de tekst klaar is (of de pop-up sluit), stopt hij met loopen
        // We gebruiken geen .pause() hier om hem netjes te laten eindigen
      }
    }
  }, [showTutorial, isTextFullyTyped]);

  useEffect(() => {
    const checkTokenPopup = async () => {
      if (!crewData?.id || weekAssignments.length === 0) return;

      const offset = new Date().getTimezoneOffset() * 60000;
      const todayStr = new Date(new Date() - offset).toISOString().split("T")[0];

      const yesterday = new Date(new Date() - offset);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const yesterdayAssignment = weekAssignments.find((a) => a.assignment_date === yesterdayStr);

      if (yesterdayAssignment && yesterdayAssignment.status === "saved_by_token") {
        const storageKey = `@token_seen_${crewData.id}_${yesterdayStr}`;
        const hasSeen = await AsyncStorage.getItem(storageKey);

        if (!hasSeen) {
          setShowTokenModal(true);
          await AsyncStorage.setItem(storageKey, "true");
        }
      }
    };
    checkTokenPopup();
  }, [weekAssignments]);

  // --- 3. DATA OPHALEN & STREAK ENGINE ---
  const fetchActivityLog = async (pageNumber, shouldAppend = false) => {
    if (!crewData?.id) return;

    if (shouldAppend) setIsMoreLoading(true);

    const from = pageNumber * ACTIVITIES_PER_PAGE;
    const to = from + ACTIVITIES_PER_PAGE - 1;

    const { data } = await supabase.from("crew_activity_log").select(`id, event_type, metadata, created_at, profiles ( display_name )`).eq("crew_id", crewData.id).order("created_at", { ascending: false }).range(from, to);

    if (shouldAppend) setIsMoreLoading(false);

    if (data) {
      if (shouldAppend) {
        setActivities((prev) => [...prev, ...data]);
      } else {
        setActivities(data);
      }

      if (data.length < ACTIVITIES_PER_PAGE) {
        setHasMoreActivities(false);
      } else {
        setHasMoreActivities(true);
      }
    } else {
      setHasMoreActivities(false);
    }
  };

  const initStreakEngine = async () => {
    if (!crewData?.id) {
      setScheduleLoading(false);
      return;
    }
    try {
      if (weekAssignments.length === 0) {
        setScheduleLoading(true);
      }

      await processNachtCheck(crewData.id);
      await ensureFourteenDaySchedule(crewData.id);

      const { data: profilesData } = await supabase.from("crew_members").select("user_id, profiles(display_name, avatar_url)").eq("crew_id", crewData.id);

      const profileMap = {};
      const membersArray = [];

      if (profilesData) {
        profilesData.forEach((p) => {
          const name = p.profiles?.display_name || "Loper";
          const avatar = p.profiles?.avatar_url || null;

          profileMap[p.user_id] = name;
          membersArray.push({ id: p.user_id, name, avatar });
        });
        setCrewProfilesMap(profileMap);
        setCrewMembersList(membersArray);
      }

      const getLocalYYYYMMDD = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d - offset).toISOString().split("T")[0];
      };

      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() - daysSinceMonday);
      const mondayStr = getLocalYYYYMMDD(thisMonday);

      const nextSunday = new Date(thisMonday);
      nextSunday.setDate(thisMonday.getDate() + 13);
      const nextSundayStr = getLocalYYYYMMDD(nextSunday);

      const { data: assignments } = await supabase.from("crew_daily_assignments").select("*").eq("crew_id", crewData.id).gte("assignment_date", mondayStr).lte("assignment_date", nextSundayStr).order("assignment_date", { ascending: true });

      if (assignments && assignments.length > 0) {
        setWeekAssignments(assignments);

        const todayStr = getLocalYYYYMMDD(new Date());
        const todayData = assignments.find((a) => a.assignment_date === todayStr);

        setTodayAssignment(todayData || null);

        if (todayData?.is_rest_day) {
          setBatonHolderNames("Rest Day");
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
    if (activitiesPage > 0) {
      fetchActivityLog(activitiesPage, true);
    }
  }, [activitiesPage]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      refreshCrewData();
      setActivitiesPage(0);
      setHasMoreActivities(true);
      fetchActivityLog(0, false);
      initStreakEngine();
    });
    fetchActivityLog(0, false);
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
            A Rest Day Token <Text style={styles.activityAction}>was deployed to save the streak!</Text>
          </Text>
        );
      default:
        return <Text>Something happened in the crew.</Text>;
    }
  };

  if (isFirstLoad) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryOrange} />
      </View>
    );
  }

  if (!crewData || !crewData.id) {
    return (
      <SafeAreaView style={styles.emptyCrewContainer}>
        <View style={styles.emptyCrewContent}>
          <Ionicons name="people-circle-outline" size={100} color={COLORS.textMuted} />
          <Text style={styles.emptyCrewTitle}>You're flying solo!</Text>
          <Text style={styles.emptyCrewText}>Running is better together. Join an existing crew or start your own to unlock the relay streak and epic quests.</Text>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={() => navigation.navigate("JoinCrew")}>
            <Text style={styles.primaryButtonText}>Join or Create a Crew</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
          {crewMembersList.map((member, index) => {
            const initial = member.name.charAt(0).toUpperCase();
            const bgColors = [COLORS.primaryOrange, COLORS.mascotGreen, COLORS.secondaryYellow, "#3498db", "#9b59b6"];
            const color = bgColors[index % bgColors.length];

            return (
              <View key={member.id} style={[styles.avatar, { backgroundColor: color, marginLeft: index > 0 ? -15 : 0 }]}>
                {member.avatar ? <Image source={{ uri: member.avatar }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initial}</Text>}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.bannerHeader}>
        <Text style={styles.sectionTitle}>Relay Streak</Text>
      </View>

      <ImageBackground source={require("../../assets/images/streak-banner.png")} style={styles.illustratorBannerPlaceholder} imageStyle={{ borderRadius: 16 }}>
        <View style={{ flex: 1 }} />

        <View style={styles.bannerTextContainer}>
          <Animated.Text style={[styles.bannerStreakNumber, { transform: [{ scale: streakAnimation }] }]}>{crewData?.current_streak || 0}</Animated.Text>

          <Text style={styles.bannerStreakLabel}>{crewData?.current_streak === 1 ? "Day" : "Days"}</Text>
        </View>
      </ImageBackground>

      {crewData?.current_streak === 0 ? (
        <View style={styles.startStreakCard}>
          <View style={styles.rocketCircle}>
            <Ionicons name="rocket" size={32} color="#FFF" />
          </View>
          <Text style={styles.startStreakTitle}>Ignite the Streak!</Text>
          <Text style={styles.startStreakText}>The relay streak is currently inactive. Upload a run today to ignite the streak and generate the crew's schedule!</Text>
        </View>
      ) : (
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
                  {todayAssignment?.status === "completed" ? "Streak secured for today! 🎉" : todayAssignment?.is_rest_day ? "Enjoy your rest day!" : timeRemaining}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

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

                const diffInMs = new Date(todayStr) - new Date(day.assignment_date);
                const daysAgo = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
                const isPartOfCurrentStreak = daysAgo < (crewData?.current_streak || 0);

                let dayStatusColor = COLORS.textMuted;
                let dayIcon = "ellipse-outline";
                let lopers = "";

                if (isBeforeCreation) {
                  dayStatusColor = "#475569";
                  dayIcon = "remove-circle-outline";
                  lopers = "Crew not formed yet";
                } else if (day.assignment_date < todayStr && !isPartOfCurrentStreak) {
                  dayStatusColor = "#475569";
                  dayIcon = "close";
                  lopers = "No run logged";
                } else if (day.status === "saved_by_token") {
                  dayStatusColor = COLORS.secondaryYellow;
                  dayIcon = "shield-checkmark";
                  lopers = "Rest day token saved the streak";
                } else if (day.status === "completed") {
                  dayStatusColor = COLORS.mascotGreen;
                  dayIcon = "checkmark-circle";
                  lopers = day.is_rest_day ? "Rest Day completed!" : day.assigned_users?.map((id) => crewProfilesMap[id]).join(" & ") || "Goal achieved!";
                } else if (day.status === "failed") {
                  dayStatusColor = "#e74c3c";
                  dayIcon = "close-circle";
                  lopers = day.is_rest_day ? "Rest Day" : day.assigned_users?.map((id) => crewProfilesMap[id]).join(" & ") || "Failed";
                } else {
                  if (day.is_rest_day) {
                    dayStatusColor = "#3498db";
                    dayIcon = "snow";
                    lopers = "Rest Day";
                  } else {
                    dayStatusColor = isToday ? COLORS.primaryOrange : COLORS.textMuted;
                    dayIcon = isToday ? "walk" : "ellipse-outline";
                    lopers = day.assigned_users?.map((id) => crewProfilesMap[id]).join(" & ") || "No runners";
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

      <Modal visible={showTokenModal} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { justifyContent: "center", alignItems: "center" }]}>
          <View style={[styles.modalContent, { width: "90%", borderRadius: 24, padding: 30, paddingTop: 45, alignItems: "center", position: "relative" }]}>
            <TouchableOpacity style={{ position: "absolute", top: 15, right: 15, zIndex: 10, padding: 5 }} activeOpacity={0.7} onPress={() => setShowTokenModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.textMuted} />
            </TouchableOpacity>

            <Image style={{ width: 160, height: 160, marginBottom: 20, resizeMode: "contain" }} source={require("../../assets/images/rest-day-token-icon.png")} />

            <Text style={[styles.modalTitle, { textAlign: "center", fontSize: 28 }]}>Streak Saved!</Text>

            <Text style={[styles.message, { color: COLORS.textMuted, textAlign: "center", marginTop: 10, marginBottom: 10, lineHeight: 24 }]}>The crew didn't run yesterday. But don't worry, a Rest Day Token was used and your streak is safe!</Text>
          </View>
        </View>
      </Modal>

      {/* 🚀 DE VERNIEUWDE EN SIMPELE SCHEDULE TUTORIAL MODAL */}
      <Modal visible={showTutorial} animationType="none" transparent={true}>
        <Animated.View style={{ flex: 1, opacity: tutorialOpacity }}>
          <TouchableOpacity 
            style={styles.tutorialOverlay} 
            activeOpacity={1} 
            onPress={handleTutorialNext}
          >
            <SafeAreaView style={styles.buddyTutorialContainer}>
              
              <View style={styles.speechBubbleCardSetup}>
                <Text style={styles.bodyTextBubble}>
                  {displayedText}
                </Text>
              </View>
              
              <View style={styles.buddyRow}>
                <LottieView
                ref={buddyAnimationRef}
                source={require("../../assets/animations/mascot-talking.json")}
                autoPlay={false}
                loop={!isTextFullyTyped}
                renderMode="SOFTWARE"
                style={styles.lottieExtraLargeSetup}
              />
              </View>

            </SafeAreaView>

            {/* Toont de hint pas als de tekst klaar is met typen */}
            {isTextFullyTyped && (
              <Text style={styles.tapToContinueText}>Tap anywhere to continue...</Text>
            )}

          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* STRAVA SYNC BUTTON */}
      <TouchableOpacity style={[styles.stravaButton, !request ? { opacity: 0.5 } : {}]} activeOpacity={0.8} disabled={!request} onPress={() => promptAsync()}>
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
                  <View style={styles.activityUser}>{renderActivityText(item)}</View>
                  <Text style={styles.activityMeta}>{formatRelativeTime(item.created_at)}</Text>
                </View>
              </View>
            );
          })
        )}

        {hasMoreActivities && (
          <TouchableOpacity style={styles.viewMoreButton} activeOpacity={0.7} onPress={() => setActivitiesPage((prev) => prev + 1)} disabled={isMoreLoading}>
            {isMoreLoading ? <ActivityIndicator size="small" color={COLORS.secondaryYellow} /> : <Text style={styles.viewMoreText}>View more &gt;</Text>}
          </TouchableOpacity>
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
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: COLORS.background, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: "#FFF", fontSize: 14, fontWeight: "bold" },
  bannerHeader: { marginBottom: 10, paddingHorizontal: 5 },
  illustratorBannerPlaceholder: { backgroundColor: "#3a3f58", borderRadius: 16, padding: 20, marginBottom: 20, height: 140, overflow: "hidden", flexDirection: "row", borderColor: "#3a3f58", borderWidth: 3 },
  bannerTextContainer: { flex: 1, alignItems: "center", flexDirection: "row", marginLeft: 10 },
  bannerStreakNumber: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 65, lineHeight: 60, paddingTop: 40 },
  bannerStreakLabel: { color: "#FFF", fontFamily: "Baloo-Bold", fontSize: 40, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 2, marginTop: 17, marginLeft: 10 },
  startStreakCard: { backgroundColor: "rgba(231, 84, 56, 0.1)", borderRadius: 20, padding: 25, marginBottom: 25, alignItems: "center", borderWidth: 1, borderColor: "rgba(231, 84, 56, 0.3)" },
  rocketCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryOrange,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  startStreakTitle: { color: COLORS.primaryOrange, fontFamily: "Baloo-Bold", fontSize: 24, marginBottom: 8 },
  startStreakText: { color: COLORS.textLight, fontFamily: "Inter", fontSize: 15, textAlign: "center", lineHeight: 22 },
  viewWeekText: { color: COLORS.secondaryYellow, fontFamily: "Inter", fontSize: 12, fontWeight: "bold" },
  batonCard: { backgroundColor: COLORS.cardBackground, borderRadius: 20, padding: 20, marginBottom: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  batonHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  batonTitle: { color: COLORS.textMuted, fontFamily: "Inter", fontWeight: "bold", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 },
  batonMain: { flexDirection: "row", alignItems: "center" },
  largeAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginRight: 15 },
  batonInfo: { flex: 1 },
  batonName: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 24, marginBottom: 4 },
  timerRow: { flexDirection: "row", alignItems: "center" },
  timerText: { color: COLORS.primaryOrange, fontFamily: "Inter", fontWeight: "bold", fontSize: 14, marginLeft: 6 },
  stravaButton: {
    backgroundColor: COLORS.primaryOrange,
    flexDirection: "row",
    borderRadius: 16,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 35,
    shadowColor: COLORS.primaryOrange,
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
  viewMoreButton: { padding: 10, alignItems: "center", marginTop: 5, minHeight: 40 },
  viewMoreText: { color: COLORS.secondaryYellow, fontFamily: "Inter", fontWeight: "bold", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.cardBackground, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 24, fontFamily: "Baloo-Bold", color: COLORS.textLight },
  weekList: { marginBottom: 20 },
  weekRow: { flexDirection: "row", alignItems: "center", paddingVertical: 15 },
  sectionDivider: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 20, marginTop: 25, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)", paddingBottom: 5 },
  standardRow: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  todayRow: { borderWidth: 1.5, borderColor: COLORS.secondaryYellow, borderRadius: 12, backgroundColor: "rgba(249, 212, 35, 0.08)", paddingHorizontal: 15, marginVertical: 6 },
  todayBadge: { backgroundColor: COLORS.secondaryYellow, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  todayBadgeText: { color: COLORS.background, fontFamily: "Inter", fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
  weekDayCol: { width: 60 },
  weekDayText: { color: COLORS.textMuted, fontFamily: "Inter", fontWeight: "bold", textTransform: "uppercase" },
  weekIconCol: { width: 40, alignItems: "center" },
  weekNameCol: { flex: 1, paddingLeft: 10 },
  weekRunnerText: { color: COLORS.textLight, fontFamily: "Inter", fontSize: 16, fontWeight: "600" },
  emptyCrewContainer: { flex: 1, backgroundColor: COLORS.background },
  emptyCrewContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  emptyCrewTitle: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 32, marginTop: 20, marginBottom: 10, textAlign: "center" },
  emptyCrewText: { color: COLORS.textMuted, fontFamily: "Inter", fontSize: 16, textAlign: "center", lineHeight: 24, marginBottom: 40 },
  primaryButton: {
    backgroundColor: COLORS.primaryOrange,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  primaryButtonText: { color: "#FFF", fontFamily: "Inter", fontWeight: "bold", fontSize: 18 },

// --- TUTORIAL STYLES ---
  tutorialOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.90)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  buddyTutorialContainer: { width: '85%', alignItems: 'center' },
  speechBubbleCardSetup: { 
    backgroundColor: COLORS.cardBackground, 
    padding: 24, 
    borderRadius: 20, 
    borderBottomLeftRadius: 4, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    width: '100%', 
    marginBottom: 15, 
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 5,
    minHeight: 200 // 🚀 NIEUW: Houdt de box netjes op formaat, geen verspringende schermen meer!
  },
  bodyTextBubble: { fontSize: 16, fontFamily: "Inter", color: COLORS.textLight, lineHeight: 24 },
  buddyRow: { width: '100%', alignItems: 'flex-start', marginBottom: 10 },
  lottieExtraLargeSetup: { width: 220, height: 220, resizeMode: "contain" }, 
  tapToContinueText: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter', fontSize: 14, fontStyle: 'italic', position: 'absolute', bottom: 40, alignSelf: 'center' },
});
