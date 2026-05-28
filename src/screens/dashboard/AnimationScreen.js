// src/screens/main/AnimationScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import CustomButton from '../../components/CustomButton'; // Check je eigen pad!

// Je animaties
import cheerAnimation from '../../assets/animations/mascot-cheer.json';
// import thumbsUpAnimation from '../../assets/animations/mascot-thumbsup.json';
// import applauseAnimation from '../../assets/animations/mascot-applause.json';

export default function AnimationScreen({ route }) {
  const navigation = useNavigation();
  const { animationData } = route.params || {};
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    if (!animationData) {
      navigation.navigate('CrewScreen'); // Fallback als er geen data is
      return;
    }

    const builtSlides = [];

    // --- DIA 1: STREAK LOGICA ---
    if (animationData.streakStatus === 'day_completed') {
      builtSlides.push({
        title: "🔥 STREAK UP!",
        message: `Awesome! The relay streak is now at ${animationData.newStreak} days!`,
        animation: cheerAnimation, // Tip: Vervang met thumbsUp
        buttonText: "Epic!"
      });
    } else if (animationData.streakStatus === 'no_action_needed') {
      builtSlides.push({
        title: "Waaaaaw! 🤯",
        message: "Uploading a run on a rest day! You guys are unstoppable.",
        animation: cheerAnimation, 
        buttonText: "I know right!"
      });
    } else if (animationData.streakStatus === 'waiting_for_partner') {
      builtSlides.push({
        title: "Run Logged! ⏳",
        message: "Your part is done! We're waiting for your teammate to secure the streak.",
        animation: cheerAnimation, // Tip: Vervang met thumbsUp
        buttonText: "Fingers crossed"
      });
    }

    // --- DIA 2: QUEST LOGICA ---
    if (animationData.questCompleted) {
      builtSlides.push({
        title: "🏆 Quest Completed!",
        message: `You crushed the '${animationData.questTitle}' challenge. Your crew earned a Rest Day Token!`,
        animation: cheerAnimation, // Tip: Vervang met applause
        buttonText: "Claim Reward"
      });
    } else {
      // Normale progressie
      builtSlides.push({
        title: "Leveling up! 📈",
        message: `Your run added ${animationData.timeMins} minutes to the active crew quest. Keep going!`,
        animation: cheerAnimation,
        buttonText: "Finish"
      });
    }

    setSlides(builtSlides);
  }, [animationData]);

  // Als de slides nog geladen worden, toon een leeg scherm
  if (slides.length === 0) return <View style={styles.container} />;

  const currentSlide = slides[currentSlideIndex];

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      // Ga naar de volgende animatie
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      // Laatste dia bereikt? Ga terug naar de Crew!
      // (Let op: Zorg dat de naam van dit scherm klopt met jouw navigator)
      navigation.navigate('CrewScreen'); 
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
            // De 'key' forceert de Lottie player om te herstarten bij een nieuwe slide
            key={currentSlideIndex} 
            source={currentSlide.animation}
            autoPlay
            loop={true}
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
    backgroundColor: COLORS.background, // Jouw donkere app achtergrond
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