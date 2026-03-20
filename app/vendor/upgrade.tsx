import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function UpgradePlanScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Upgrade Your Plan</Text>
      <Text style={styles.subtitle}>
        Choose the plan that fits how you want to grow on BiteBeacon.
      </Text>

      <View style={styles.planCard}>
        <Text style={styles.planName}>Growth</Text>
        <Text style={styles.planPrice}>£9.99 / month</Text>
        <Text style={styles.planText}>Best for active vendors who want a stronger listing.</Text>

        <Text style={styles.feature}>• Images</Text>
        <Text style={styles.feature}>• Live status</Text>
        <Text style={styles.feature}>• Analytics</Text>
        <Text style={styles.feature}>• Reviews</Text>

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Coming Soon</Text>
        </Pressable>
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planName}>Pro</Text>
        <Text style={styles.planPrice}>£14.99+ / month</Text>
        <Text style={styles.planText}>Built for vendors who want more visibility and growth tools.</Text>

        <Text style={styles.feature}>• Everything in Growth</Text>
        <Text style={styles.feature}>• Priority placement</Text>
        <Text style={styles.feature}>• Notifications</Text>
        <Text style={styles.feature}>• Promotions</Text>
        <Text style={styles.feature}>• Featured badge</Text>
        <Text style={styles.feature}>• Trending boost</Text>

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Coming Soon</Text>
        </Pressable>
      </View>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F4F2",
  },

  content: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
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
    lineHeight: 22,
    marginBottom: 24,
  },

  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#D9D9D9",
  },

  planName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  planPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF7A00",
    marginBottom: 10,
  },

  planText: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 21,
    marginBottom: 14,
  },

  feature: {
    fontSize: 14,
    color: "#222222",
    marginBottom: 8,
  },

  primaryButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#222222",
    fontSize: 15,
    fontWeight: "700",
  },
});