// src/components/ui/CustomButton.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';

export default function CustomButton({ title, onPress, type = 'primary' }) {
  // We checken of het een primary knop is, zo niet, dan is het een secondary knop
  const isPrimary = type === 'primary';

  return (
    <TouchableOpacity
      // We combineren de basis-stijl met de specifieke stijl (oranje achtergrond of transparant met rand)
      style={[styles.button, isPrimary ? styles.primaryBg : styles.secondaryBg]}
      onPress={onPress}
      activeOpacity={0.8} // Maakt de klik-animatie iets zachter
    >
      <Text style={[styles.text, isPrimary ? styles.primaryText : styles.secondaryText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 18,
    borderRadius: 24, // Jouw mooie ronde hoeken
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 15,
    width: '100%',
  },
  primaryBg: {
    backgroundColor: COLORS.primaryOrange, // Hier gebruiken we jouw gefixte naam!
  },
  secondaryBg: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.textDark,
  },
  text: {
    fontSize: 18,
    fontFamily: 'Inter', // Jouw nieuwe lettertype! (gebruik 'Inter-Bold' als je die variant hebt)
  },
  primaryText: {
    color: COLORS.white,
  },
  secondaryText: {
    color: COLORS.textDark,
  },
});