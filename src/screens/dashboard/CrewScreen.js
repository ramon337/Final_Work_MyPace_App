import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../theme/colors';

export default function CrewScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Crew Dashboard komt hier</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: COLORS.textLight,
    fontFamily: 'Baloo-Bold',
    fontSize: 24,
  },
});