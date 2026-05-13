// src/screens/onboarding/LoginScreen.js
import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { COLORS } from "../../theme/colors";
import CustomButton from "../../components/ui/CustomButton";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Vul alstublieft alle velden in.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
    // Als het wel lukt, hoeven we niks te doen! App.js ziet de sessie en navigeert automatisch.
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.stepTitle}>Welcome Back</Text>
        <Text style={styles.bodyText}>Log in to sync your runs and check your crew's progress.</Text>

        {errorMsg !== "" && (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={20} color="#FF6B6B" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Email</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Enter your email" 
          placeholderTextColor="#999999" 
          keyboardType="email-address" 
          autoCapitalize="none" 
          value={email} 
          onChangeText={setEmail} 
        />
        
        <Text style={styles.sectionLabel}>Password</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Enter your password" 
          placeholderTextColor="#999999" 
          secureTextEntry={true} 
          value={password} 
          onChangeText={setPassword} 
        />
      </View>

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
        ) : (
          <CustomButton title="Log In" type="primary" onPress={handleLogin} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", width: "90%", marginTop: 10, marginBottom: 30 },
  backButton: { padding: 10, marginLeft: -10 },
  content: { flex: 1, width: "90%" },
  stepTitle: { fontSize: 32, fontFamily: "Baloo-Bold", color: COLORS.primaryOrange, marginBottom: 10 },
  bodyText: { fontSize: 16, fontFamily: "Inter", color: COLORS.textLight, lineHeight: 24, marginBottom: 30 },
  sectionLabel: { fontSize: 16, fontFamily: "Inter", fontWeight: "600", color: COLORS.textLight, marginBottom: 8 },
  input: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: 24, marginBottom: 20, width: "100%", backgroundColor: COLORS.cardBackground, color: COLORS.textLight, fontFamily: "Inter", fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  buttonContainer: { width: "90%", paddingBottom: 30, alignItems: "center" },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 107, 107, 0.1)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FF6B6B', marginBottom: 20 },
  errorText: { color: '#FF6B6B', fontFamily: 'Inter', marginLeft: 8, fontSize: 14, flex: 1 },
});