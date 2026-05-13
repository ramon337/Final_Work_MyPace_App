// src/screens/dashboard/YouScreen.js
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../theme/colors';

export default function YouScreen() {

  const handleLogout = async () => {
    console.log("Bezig met uitloggen...");
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("Fout bij uitloggen:", error);
      Alert.alert("Oeps!", "Er ging iets mis bij het uitloggen.");
    }
    // Let op: we hoeven GEEN navigation.navigate te doen!
    // App.js ziet dat de sessie weg is en toont direct de Welcome screen.
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.placeholderCard}>
          <Ionicons name="person-circle-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.placeholderText}>Jouw profielgegevens komen hier...</Text>
        </View>
      </View>

      {/* LOGOUT BUTTON ONDERAAN */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFF" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: COLORS.textLight,
    fontFamily: 'Baloo-Bold',
    fontSize: 32,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderCard: {
    alignItems: 'center',
    opacity: 0.5,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontFamily: 'Inter',
    marginTop: 10,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
  logoutButton: {
    backgroundColor: '#FF6B6B', // Mooie rode kleur voor destructieve acties
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  logoutText: {
    color: '#FFF',
    fontFamily: 'Inter',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});