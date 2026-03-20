import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { getCurrentUser } from "../../services/authService";
import { getVendorByOwnerId } from "../../services/vendorService";

export default function VendorLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }

    const user = await getCurrentUser();

    if (!user) {
      Alert.alert("Error", "Could not load vendor account.");
      return;
    }

    try {
      const vendor = await getVendorByOwnerId(user.id);

      if (vendor) {
        router.replace({
          pathname: "/vendor/dashboard",
          params: { id: vendor.id },
        });
        return;
      }

      router.replace("/vendor/register");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vendor Login</Text>
      <Text style={styles.subtitle}>
        Log in to manage your BiteBeacon vendor listing.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.primaryButton} onPress={handleLogin}>
        <Text style={styles.primaryButtonText}>Log In</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/auth/vendor-signup")}
      >
        <Text style={styles.secondaryButtonText}>Create Vendor Account</Text>
      </Pressable>

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/welcome")}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7F4F2",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#5F6368",
    marginBottom: 24,
  },

  input: {
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },

  primaryButton: {
    backgroundColor: "#0B2A5B",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  secondaryButton: {
    backgroundColor: "#FF7A00",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  backButton: {
    backgroundColor: "#D9D9D9",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  backButtonText: {
    color: "#222222",
    fontWeight: "700",
  },
});