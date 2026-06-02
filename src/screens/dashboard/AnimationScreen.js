// src/screens/main/AnimationScreen.js
import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, SafeAreaView, Animated, Image } from "react-native";
import LottieView from "lottie-react-native";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "../../theme/colors";
import CustomButton from "../../components/ui/CustomButton";

import cheerAnimation from "../../assets/animations/mascot-cheering.json";

// 🚀 LOKALE MAPPING VOOR DE AFBEELDINGEN
const QUEST_IMAGES = {
  42: require("../../assets/images/quest-1-image.jpeg"),
  100: require("../../assets/images/quest-2-image.jpeg"),
  342: require("../../assets/images/quest-3-image.jpeg"),
  790: require("../../assets/images/quest-4-image.jpeg"),
  3940: require("../../assets/images/quest-5-image.jpeg"),
  21196: require("../../assets/images/quest-6-image.jpg"),
  40075: require("../../assets/images/quest-7-image.jpg"),
};

const getQuestImage = (targetAmount) => {
  return QUEST_IMAGES[targetAmount] || QUEST_IMAGES[42];
};

// --- HET VERNIEUWDE DYNAMISCHE PROGRESS BAR COMPONENT ---
const DynamicQuestBar = ({ title, oldProgress, runDuration, targetAmount }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const oldPercent = Math.min((oldProgress / targetAmount) * 100, 100);
  const newPercent = Math.min((runDuration / targetAmount) * 100, 100 - oldPercent);

  const newTotal = oldProgress + runDuration;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: newPercent,
      duration: 1500,
      delay: 500,
      useNativeDriver: false,
    }).start();
  }, [newPercent]);

  return (
    <View style={barStyles.barContainer}>
      <View style={barStyles.textRow}>
        <Text style={barStyles.titleText}>{title || "Quest"}</Text>
        <Text style={barStyles.numberText}>
          {newTotal} / {targetAmount}
        </Text>
      </View>

      <View style={barStyles.trackWrapper}>
        <View style={barStyles.track}>
          <View style={[barStyles.oldFill, { width: `${oldPercent}%` }]} />
          <Animated.View
            style={[
              barStyles.newFill,
              {
                width: animatedWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={barStyles.plusText}>+{runDuration}</Text>
      </View>
    </View>
  );
};

export default function AnimationScreen({ route }) {
  const navigation = useNavigation();
  const animationRef = useRef(null);
  const { animationData } = route.params || {};
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState([]);

  // Animatie waarde voor het rollende getal (van 0 naar 1)
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // 🚀 NIEUW: Animatie waarde voor de vallende medaille (start ver buiten beeld)
  const badgeDropAnim = useRef(new Animated.Value(-800)).current;

  // --- 1. Bouw de slides ---
  useEffect(() => {
    if (!animationData) {
      navigation.navigate("MainTabs");
      return;
    }

    const builtSlides = [];

    // STREAK SLIDES
    if (animationData.streakStatus === "streak_started") {
      builtSlides.push({
        title: "Relay Streak",
        message: "You started the relay streak! The crew schedule has been generated.",
        animation: cheerAnimation,
        buttonText: "Let's Go!",
        isQuest: false,
        isStreakUpdate: true,
        streakValue: 1,
      });
    } else if (animationData.streakStatus === "day_completed") {
      builtSlides.push({
        title: "Relay Streak",
        message: "Great work! You've kept the relay alive.",
        animation: cheerAnimation,
        buttonText: "Epic!",
        isQuest: false,
        isStreakUpdate: true,
        streakValue: animationData.newStreak,
      });
    } else if (animationData.streakStatus === "no_action_needed") {
      builtSlides.push({ title: "Waaaaaw! 🤯", message: "Uploading a run on a rest day! You guys are unstoppable.", animation: cheerAnimation, buttonText: "I know right!", isQuest: false });
    } else if (animationData.streakStatus === "waiting_for_partner") {
      builtSlides.push({ title: "Run Logged! ⏳", message: "Your part is done! We're waiting for your teammate to secure the streak.", animation: cheerAnimation, buttonText: "Fingers crossed", isQuest: false });
    }

    // QUEST SLIDES
    if (animationData.questCompleted) {
      builtSlides.push({
        title: "Quest Completed!",
        message: `Your run completed the crew quest.`,
        buttonText: "Claim Reward",
        isQuest: true,
        questImage: getQuestImage(animationData.questTarget),
        showProgressBar: true,
        questTitle: animationData.questTitle,
        oldProgress: animationData.questProgress || 0,
        runDuration: animationData.timeMins,
        targetAmount: animationData.questTarget || 100,
      });
    } else if (animationData.questTarget) {
      builtSlides.push({
        title: "Leveling up!",
        message: `Your run added ${animationData.timeMins} minutes to the active crew quest. Keep going!`,
        buttonText: "Finish",
        isQuest: true,
        questImage: getQuestImage(animationData.questTarget),
        showProgressBar: true,
        questTitle: animationData.questTitle,
        oldProgress: animationData.questProgress || 0,
        runDuration: animationData.timeMins,
        targetAmount: animationData.questTarget || 100,
      });
    }

    // 🚀 NIEUW: BADGE SLIDES (First Run)
    if (animationData.badgeUnlocked === 'first_run') {
      
      // Slide 1: Mascotte juicht
      builtSlides.push({
        title: "Incredible! 🎉",
        message: "Great job, you completed your very first run! Welcome to the runner's club.",
        animation: cheerAnimation,
        buttonText: "Continue",
        isQuest: false,
        isBadge: false
      });

      // Slide 2: Medaille valt in beeld
      builtSlides.push({
        title: "Achievement Unlocked",
        message: "You earned the 'First Run' badge! Check it out in your Trophy Room.",
        buttonText: "Awesome!",
        isQuest: false,
        isBadge: true,
        badgeImage: require('../../assets/images/badge-first-run.png') // <-- Zorg dat deze file bestaat!
      });
    }

    setSlides(builtSlides);
  }, [animationData]);

  // --- 2. Start Lottie & Animaties bij een nieuwe slide ---
  useEffect(() => {
    // Start de lottie animatie
    const timer = setTimeout(() => {
      if (animationRef.current) animationRef.current.play();
    }, 150);

    // Start de Rol/Slide animatie als dit een Streak slide is
    if (slides[currentSlideIndex]?.isStreakUpdate) {
      slideAnim.setValue(0);
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
    if (slides[currentSlideIndex]?.isBadge) {
      badgeDropAnim.setValue(-800); // Reset naar bovenkant scherm
      Animated.spring(badgeDropAnim, {
        toValue: 0, // Val naar het midden
        friction: 5, // Laat hem een beetje stuiteren
        tension: 40,
        useNativeDriver: true,
      }).start();
    }

    return () => clearTimeout(timer);
  }, [currentSlideIndex, slides]);

  if (slides.length === 0) return <View style={styles.container} />;

  const currentSlide = slides[currentSlideIndex];

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      navigation.navigate("MainTabs");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          
          <View style={styles.titleWrapper}>
            <Text style={styles.title}>{currentSlide.title}</Text>
            {currentSlide.isStreakUpdate && <Image source={require("../../assets/images/streak-icon.png")} style={styles.streakIconAbsolute} />}
          </View>
          
          {currentSlide.isStreakUpdate ? (
            <View style={styles.streakBox}>
              <View style={styles.streakNumberContainer}>
                <Animated.Text
                  style={[
                    styles.streakNumber,
                    { position: "absolute" },
                    {
                      opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                      transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }) }],
                    },
                  ]}
                >
                  {Math.max(0, currentSlide.streakValue - 1)}
                </Animated.Text>

                <Animated.Text
                  style={[
                    styles.streakNumber,
                    {
                      opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                      transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
                    },
                  ]}
                >
                  {currentSlide.streakValue}
                </Animated.Text>
              </View>
              <Text style={styles.streakLabel}>DAYS</Text>
            </View>
          ) : (
            <Text style={styles.message}>{currentSlide.message}</Text>
          )}
        </View>

        <View style={styles.mediaContainer}>
          {currentSlide.isQuest ? (
            <View style={styles.imageWrapper}>
              <Image source={currentSlide.questImage} style={styles.questCover} />
              <View style={styles.imageOverlay} />
            </View>
          ) : currentSlide.isBadge ? (
            <Animated.View style={[styles.badgeImageWrapper, { transform: [{ translateY: badgeDropAnim }] }]}>
              <Image source={currentSlide.badgeImage} style={styles.badgeImageContent} />
            </Animated.View>
          ) : (
            // Standaard Lottie Mascot
            <LottieView ref={animationRef} key={currentSlideIndex} source={currentSlide.animation} autoPlay={false} loop={true} renderMode="SOFTWARE" style={styles.lottie} />
          )}
        </View>

        {currentSlide.showProgressBar && <DynamicQuestBar title={currentSlide.questTitle} oldProgress={currentSlide.oldProgress} runDuration={currentSlide.runDuration} targetAmount={currentSlide.targetAmount} />}

        <View style={styles.buttonContainer}>
          <CustomButton title={currentSlide.buttonText} type="primary" onPress={handleNext} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { flex: 1, width: "100%", justifyContent: "space-between", alignItems: "center", padding: 20 },
  textContainer: { alignItems: "center", marginTop: 40 },
  title: { color: COLORS.primaryOrange, fontFamily: 'Baloo-Bold', fontSize: 36, textAlign: 'center' },
  titleWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  message: { color: COLORS.textLight, fontFamily: "Inter", fontSize: 18, textAlign: "center", lineHeight: 26, paddingHorizontal: 15 },
  streakIconAbsolute: { position: 'absolute', right: -45, width: 30, height: 30 },
  
  streakBox: { alignItems: "center", marginVertical: 10 },
  streakNumberContainer: { height: 100, justifyContent: "center", alignItems: "center", overflow: "hidden", paddingTop: 10 },
  streakNumber: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 80, lineHeight: 100, includeFontPadding: false },
  streakLabel: { color: COLORS.textMuted, fontFamily: "Inter", fontSize: 20, fontWeight: "bold", letterSpacing: 2 },

  mediaContainer: { flex: 1, width: "100%", justifyContent: "center", alignItems: "center" },
  lottie: { width: 400, height: 400 },
  imageWrapper: { width: 250, height: 250, borderRadius: 20, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.1)" },
  questCover: { width: "100%", height: "100%", resizeMode: "cover" },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.2)" },
  
  // 🚀 NIEUW: Styling voor de vallende medaille
  badgeImageWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.secondaryYellow, // Subtiel glow effect!
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  badgeImageContent: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  buttonContainer: { width: "100%", paddingBottom: 10, marginTop: 20 },
});

const barStyles = StyleSheet.create({
  barContainer: { width: "100%", padding: 20, backgroundColor: COLORS.cardBackground, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  textRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, alignItems: "center" },
  titleText: { color: COLORS.textLight, fontFamily: "Baloo-Bold", fontSize: 18 },
  numberText: { color: COLORS.textMuted, fontFamily: "Inter", fontWeight: "bold" },
  trackWrapper: { flexDirection: "row", alignItems: "center" },
  track: { flex: 1, height: 16, backgroundColor: "#3a3f58", borderRadius: 8, flexDirection: "row", overflow: "hidden" },
  oldFill: { height: "100%", backgroundColor: COLORS.primaryOrange },
  newFill: { height: "100%", backgroundColor: "#FF8C5A", borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  plusText: { marginLeft: 15, color: "#FF8C5A", fontFamily: "Baloo-Bold", fontSize: 16 },
});