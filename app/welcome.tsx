import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>BiteBeacon</Text>

      <Text style={styles.subtitle}>
        Discover the best mobile food vendors near you.
      </Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/auth/user-gateway")}
      >
        <Text style={styles.primaryButtonText}>Browse Food Vendors</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/auth/login")}
      >
        <Text style={styles.secondaryButtonText}>Vendor Portal</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B2A5B",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  logo: {
    width: 220,
    height: 220,
    marginBottom: 10,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 40,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },

  primaryButtonText: {
    color: "#0B2A5B",
    fontSize: 16,
    fontWeight: "800",
  },

  secondaryButton: {
    width: "100%",
    backgroundColor: "#FF7A00",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});