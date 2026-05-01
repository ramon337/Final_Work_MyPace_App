import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../theme/colors';

export default function ProgressBar({ currentStep, totalSteps = 4 }) {
  // 1. We maken een 'animatie-waarde' aan die we bewaren in het geheugen (begint op 0)
  const animatedWidth = useRef(new Animated.Value(0)).current;

  // 2. Telkens als 'currentStep' verandert, draaien we deze animatie
  useEffect(() => {
    // Bereken het percentage (bijv. stap 1 van 4 = 0.25)
    const targetValue = currentStep / totalSteps;

    Animated.timing(animatedWidth, {
      toValue: targetValue,
      duration: 500, // De animatie duurt 500 milliseconden (een halve seconde)
      useNativeDriver: false, // Moet op 'false' staan als we met 'width' (layout) animeren
    }).start();
  }, [currentStep, totalSteps]);

  // 3. Zet het getal (0.25) om naar een percentage ('25%') voor CSS
  const widthPercentage = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* De lichtgrijze achtergrondbalk */}
      <View style={styles.track}>
        
        {/* De geanimeerde oranje vul-balk */}
        <Animated.View style={[styles.fill, { width: widthPercentage }]} />
        
        {/* De tekst EXACT in het midden gecentreerd */}
        <View style={styles.textContainer}>
          <Text style={styles.stepText}>{currentStep}/{totalSteps}</Text>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Neemt de resterende ruimte naast de terug-knop in beslag
    marginLeft: 15, // Beetje afstand van de terug-knop
    width: '80%',
  },
  track: {
    height: 24, // Dikte van de hele balk
    backgroundColor: '#E0E0E0', // Lichtgrijs
    borderRadius: 12, // Mooi rond
    overflow: 'hidden', // Zorgt dat de oranje balk netjes binnen de ronde hoeken blijft
    position: 'relative',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 12,
  },
  textContainer: {
    ...StyleSheet.absoluteFillObject, // Zorgt dat deze box de hele track bedekt
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    fontFamily: 'Inter',
    fontWeight: 'bold',
    fontSize: 12,
    color: COLORS.textDark, // Zwart leest het beste over oranje én grijs!
    textTransform: 'uppercase', // Maakt er "STEP 1/4" van, ziet er strak uit
  },
});