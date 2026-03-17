import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function AuthScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Nagrik Setu</Text>

      <TouchableOpacity
        style={styles.primary}
        onPress={() => router.push("/signup")}
      >
        <Text style={styles.primaryText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondary}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.secondaryText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    color: "#2e7d32",
    fontWeight: "bold",
    marginBottom: 40,
  },
  primary: {
    backgroundColor: "#43a047",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  primaryText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  secondary: {
    borderWidth: 2,
    borderColor: "#43a047",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: { color: "#2e7d32", fontWeight: "bold", fontSize: 16 },
});