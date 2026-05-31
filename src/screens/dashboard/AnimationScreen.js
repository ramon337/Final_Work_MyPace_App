// src/screens/main/AnimationScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import CustomButton from '../../components/ui/CustomButton';

import cheerAnimation from '../../assets/animations/mascot-cheering.json';
// import thumbsUpAnimation from '../../assets/animations/mascot-thumbsup.json';
// import applauseAnimation from '../../assets/animations/mascot-applause.json';

export default function AnimationScreen({ route }) {
  const navigation = useNavigation();
  const animationRef = useRef(null);
  const { animationData } = route.params || {};
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState([]);

  // --- 1. Bouw de slides ---
  useEffect(() => {
    if (!animationData) {
      navigation.navigate('MainTabs'); 
      return;
    }

    const builtSlides = [];

    if (animationData.streakStatus === 'streak_started') {
      builtSlides.push({ title: "🔥 IGNITION!", message: "You started the relay streak! The crew schedule has been generated.", animation: cheerAnimation, buttonText: "Let's Go!" });
    } else if (animationData.streakStatus === 'day_completed') {
      builtSlides.push({ title: "🔥 STREAK UP!", message: `Awesome! The relay streak is now at ${animationData.newStreak} days!`, animation: cheerAnimation, buttonText: "Epic!" });
    } else if (animationData.streakStatus === 'no_action_needed') {
      builtSlides.push({ title: "Waaaaaw! 🤯", message: "Uploading a run on a rest day! You guys are unstoppable.", animation: cheerAnimation, buttonText: "I know right!" });
    } else if (animationData.streakStatus === 'waiting_for_partner') {
      builtSlides.push({ title: "Run Logged! ⏳", message: "Your part is done! We're waiting for your teammate to secure the streak.", animation: cheerAnimation, buttonText: "Fingers crossed" });
    }

    if (animationData.questCompleted) {
      builtSlides.push({ title: "🏆 Quest Completed!", message: `You crushed the '${animationData.questTitle}' challenge. Your crew earned a Rest Day Token!`, animation: cheerAnimation, buttonText: "Claim Reward" });
    } else {
      builtSlides.push({ title: "Leveling up! 📈", message: `Your run added ${animationData.timeMins} minutes to the active crew quest. Keep going!`, animation: cheerAnimation, buttonText: "Finish" });
    }

    setSlides(builtSlides);
  }, [animationData]);

  // --- 2. Start de animatie bij een nieuwe slide ---
  useEffect(() => {
    const timer = setTimeout(() => {
      animationRef.current?.play();
    }, 150); 
    return () => clearTimeout(timer);
  }, [currentSlideIndex]);

  if (slides.length === 0) return <View style={styles.container} />;

  const currentSlide = slides[currentSlideIndex];

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      navigation.navigate('MainTabs'); 
    }
  };

  // --- 3. De Handmatige Loop Hack ---
  const handleAnimationFinish = (isCancelled) => {
    // Als de animatie niet is geannuleerd (bijv. door onmounten), speel hem dan direct opnieuw af!
    if (!isCancelled) {
      animationRef.current?.play();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.message}>{currentSlide.message}</Text>
        </View>

        <View style={styles.animationContainer}>
          <LottieView
            ref={animationRef}
            key={currentSlideIndex} 
            source={currentSlide.animation}
            autoPlay={false}
            loop={true} // 👈 We vertrouwen weer op de native engine
            renderMode="SOFTWARE" // 👈 Software is stabieler op iOS voor loops zonder transparantie-bugs
            style={styles.lottie}
          />
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton 
            title={currentSlide.buttonText} 
            type="primary" 
            onPress={handleNext} 
          />
        </View>
        
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, 
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    color: COLORS.primaryOrange,
    fontFamily: 'Baloo-Bold',
    fontSize: 36,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: COLORS.textLight,
    fontFamily: 'Inter',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 15,
  },
  animationContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 350,
    height: 350,
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: 10,
  }
});