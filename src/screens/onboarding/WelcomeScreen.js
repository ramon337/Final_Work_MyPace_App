import React from 'react';
import { StyleSheet, Text, View, Image, SafeAreaView } from 'react-native';
import { COLORS } from '../../theme/colors';
import CustomButton from '../../components/ui/CustomButton';

export default function WelcomeScreen() {
  return (
    // SafeAreaView zorgt dat de app niet onder de 'notch' van je iPhone of Android verdwijnt
    <SafeAreaView style={styles.container}>
      
      {/* Top sectie met teksten */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>MyPace</Text>
        <Text style={styles.tagline}>
          Start your crew. Run together, without the pressure.
        </Text>
      </View>

      {/* Midden sectie met de Mascotte */}
      <View style={styles.imageContainer}>
        <Image 
          source={require('../../assets/images/mascot.png')} 
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </View>

      {/* Onderste sectie met knoppen met de nieuwe CustomComponent */}
      <View style={styles.buttonContainer}>
        <CustomButton 
          title="Create Account" 
          type="primary" 
          onPress={() => console.log('Naar registratie!')} 
        />
        <CustomButton 
          title="Log In" 
          type="secondary" 
          onPress={() => console.log('Naar login!')} 
        />
      </View>

    </SafeAreaView>
  );
}

// Hieronder staan de stijlen. Alle knop-stijlen zijn nu netjes verhuisd naar CustomButton.js!
const styles = StyleSheet.create({
  container: {
    flex: 1, // Neemt het hele scherm in beslag
    backgroundColor: COLORS.background,
    justifyContent: 'space-between', // Verdeelt de 3 elementen netjes over de hoogte
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 48,
    fontFamily: 'Baloo-Bold', // Jouw custom font
    color: COLORS.primaryOrange, // Jouw gefixte oranje kleur
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Inter',
    textAlign: 'center',
    color: COLORS.textDark,
    paddingHorizontal: 20,
    lineHeight: 24,
    marginTop: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  mascotImage: {
    width: 250,
    height: 250,
  },
  buttonContainer: {
    width: '90%',
    paddingBottom: 20,
  },
});