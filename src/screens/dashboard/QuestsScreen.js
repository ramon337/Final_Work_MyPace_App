import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../theme/colors';

export default function QuestsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Crew Quests komen hier</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Exact dezelfde styles als hierboven
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  text: { color: COLORS.textLight, fontFamily: 'Baloo-Bold', fontSize: 24 },
});