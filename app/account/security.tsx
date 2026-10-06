import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { validateModeratedText } from "../../lib/contentModeration";
import { supabase } from "../../lib/supabase";
import { createAccountDeletionRequest } from "../../services/accountDeletionService";
import { getCurrentUser } from "../../services/authService";

export default function SecurityScreen() {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [deleteReason, setDeleteReason] = useState<string>("");
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [isSubmittingDeletion, setIsSubmittingDeletion] = useState<boolean>(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser(): Promise<void> {
    try {
      const user = await getCurrentUser();

      if (!user) {
        setCurrentEmail(null);
        setCurrentUserId(null);
        setNewEmail("");
        return;
      }

      setCurrentEmail(user.email ?? null);
      setCurrentUserId(user.id);
      setNewEmail(user.email ?? "");
    } catch {
      setCurrentEmail(null);
      setCurrentUserId(null);
      setNewEmail("");
    }
  }

  async function handleUpdateEmail(): Promise<void> {
    if (!currentEmail) {
      Alert.alert("No account loaded", "Please log in to update your email.");
      return;
    }

    if (!newEmail.trim()) {
      Alert.alert("Missing email", "Please enter your new email address.");
      return;
    }

    if (newEmail.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
      Alert.alert("No changes made", "Please enter a different email address.");
      return;
    }

    setIsUpdatingEmail(true);

    try {
      const result = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (result.error) {
        Alert.alert("Email update failed", result.error.message);
        return;
      }

      Alert.alert(
        "Email update requested",
        "Check your inbox if confirmation is required. Your current email will remain unchanged until the update is completed."
      );
    } catch (error) {
      Alert.alert(
        "Email update failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsUpdatingEmail(false);
    }
  }

  async function handleUpdatePassword(): Promise<void> {
    if (!currentEmail) {
      Alert.alert("No account loaded", "Please log in to update your password.");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing password", "Please fill in both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Password mismatch", "The passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const result = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (result.error) {
        Alert.alert("Password update failed", result.error.message);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password updated", "Your password has been changed.");
    } catch (error) {
      Alert.alert(
        "Password update failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function handleRequestDeletion(): Promise<void> {
    if (!currentUserId || !currentEmail) {
      Alert.alert(
        "No account loaded",
        "Please log in before requesting account deletion."
      );
      return;
    }

    if (deleteConfirmText.trim() !== "DELETE") {
      Alert.alert(
        "Confirmation required",
        'Please type DELETE exactly to confirm your request.'
      );
      return;
    }

    const trimmedReason = deleteReason.trim();

    const reasonError = validateModeratedText(trimmedReason, {
      fieldLabel: "Deletion reason",
      allowEmpty: true,
      maxLength: 300,
    });

    if (reasonError) {
      Alert.alert("Request blocked", reasonError);
      return;
    }

    setIsSubmittingDeletion(true);

    try {
      await createAccountDeletionRequest({
        userId: currentUserId,
        email: currentEmail,
        reason: trimmedReason,
      });

      setDeleteReason("");
      setDeleteConfirmText("");
      Alert.alert(
        "Deletion request submitted",
        "Your request has been recorded and will be reviewed. You may be contacted if additional verification is required."
      );

      await supabase.auth.signOut();
      router.replace("/welcome");
      
    } catch (error) {
      Alert.alert(
        "Request failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsSubmittingDeletion(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>SECURITY</Text>
          <Text style={styles.title}>Account Security</Text>
          <Text style={styles.subtitle}>
            Manage the sign-in details connected to your BiteBeacon account.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionMarker}>
              <Text style={styles.sectionMarkerText}>@</Text>
            </View>

            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Email Address</Text>
              <Text style={styles.sectionDescription}>
                Change the email address you use to sign in.
              </Text>
            </View>
          </View>

          <View style={styles.currentValueBox}>
            <Text style={styles.currentValueLabel}>CURRENT EMAIL</Text>
            <Text style={styles.currentValue}>
              {currentEmail ?? "No account loaded"}
            </Text>
          </View>

          <Text style={styles.fieldLabel}>NEW EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new email"
            placeholderTextColor="rgba(255,255,255,0.34)"
            autoCapitalize="none"
            keyboardType="email-address"
            value={newEmail}
            onChangeText={setNewEmail}
            selectionColor="#F4B547"
            accessibilityLabel="New email address"
          />

          <Text style={styles.helperText}>
            Depending on your account settings, you may need to confirm the new
            address before the change is completed.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              isUpdatingEmail && styles.buttonDisabled,
            ]}
            onPress={handleUpdateEmail}
            disabled={isUpdatingEmail}
          >
            <Text style={styles.primaryButtonText}>
              {isUpdatingEmail ? "Updating..." : "Update Email"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionMarker}>
              <Text style={styles.sectionMarkerText}>••</Text>
            </View>

            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Password</Text>
              <Text style={styles.sectionDescription}>
                Choose a new password for your BiteBeacon account.
              </Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="rgba(255,255,255,0.34)"
            secureTextEntry
            autoCapitalize="none"
            value={newPassword}
            onChangeText={setNewPassword}
            selectionColor="#F4B547"
            accessibilityLabel="New password"
          />

          <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="rgba(255,255,255,0.34)"
            secureTextEntry
            autoCapitalize="none"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            selectionColor="#F4B547"
            accessibilityLabel="Confirm new password"
          />

          <View style={styles.requirementRow}>
            <View style={styles.requirementDot} />
            <Text style={styles.requirementText}>
              Use at least 8 characters.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              isUpdatingPassword && styles.buttonDisabled,
            ]}
            onPress={handleUpdatePassword}
            disabled={isUpdatingPassword}
          >
            <Text style={styles.primaryButtonText}>
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.futureSecurityCard}>
          <View style={styles.futureSecurityTop}>
            <Text style={styles.futureSecurityKicker}>ACCOUNT PROTECTION</Text>
            <View style={styles.futureBadge}>
              <Text style={styles.futureBadgeText}>COMING LATER</Text>
            </View>
          </View>

          <Text style={styles.futureSecurityTitle}>
            More security controls
          </Text>
          <Text style={styles.futureSecurityText}>
            Additional account protection options can be added here as
            BiteBeacon's security tools expand.
          </Text>
        </View>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerKicker}>DANGER ZONE</Text>
          <Text style={styles.dangerTitle}>Account Deletion</Text>
          <Text style={styles.dangerText}>
            You can request permanent account deletion. Your account will be
            deleted after verification. In some cases, BiteBeacon may retain
            limited data where required for legal, security, fraud-prevention,
            billing, dispute-resolution, or platform integrity reasons.
          </Text>

          <Text style={styles.fieldLabel}>OPTIONAL REASON</Text>
          <TextInput
            style={[styles.input, styles.deleteReasonInput]}
            placeholder="Optional reason for deletion request"
            placeholderTextColor="rgba(255,255,255,0.34)"
            multiline
            maxLength={300}
            value={deleteReason}
            onChangeText={setDeleteReason}
            selectionColor="#F4B547"
            accessibilityLabel="Optional reason for account deletion"
          />

          <View style={styles.deleteWarning}>
            <Text style={styles.deleteWarningTitle}>Confirmation required</Text>
            <Text style={styles.deleteWarningText}>
              Type DELETE below to confirm this request. You can also contact
              support if you need help with account deletion.
            </Text>
          </View>

          <Text style={styles.fieldLabel}>TYPE DELETE TO CONFIRM</Text>
          <TextInput
            style={[styles.input, styles.confirmDeleteInput]}
            placeholder="Type DELETE"
            placeholderTextColor="rgba(255,255,255,0.34)"
            autoCapitalize="characters"
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
            selectionColor="#FF8F8F"
            accessibilityLabel="Type DELETE to confirm account deletion"
          />

          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
              isSubmittingDeletion && styles.buttonDisabled,
            ]}
            onPress={handleRequestDeletion}
            disabled={isSubmittingDeletion}
          >
            <Text style={styles.deleteButtonText}>
              {isSubmittingDeletion
                ? "Submitting..."
                : "Request Account Deletion"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07131F",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  hero: {
    marginBottom: 18,
  },

  kicker: {
    fontSize: 11,
    fontWeight: "900",
    color: "#F4B547",
    letterSpacing: 1.8,
    marginBottom: 8,
  },

  title: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.6,
    color: "#FFFFFF",
    marginBottom: 10,
  },

  subtitle: {
    maxWidth: 540,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: "rgba(255,255,255,0.68)",
  },

  sectionCard: {
    backgroundColor: "rgba(14,29,45,0.98)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },

  sectionMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.38)",
  },

  sectionMarkerText: {
    color: "#F4B547",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.56)",
  },

  currentValueBox: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },

  currentValueLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#F4B547",
    marginBottom: 5,
  },

  currentValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "rgba(255,255,255,0.82)",
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.52)",
    marginBottom: 7,
  },

  input: {
    minHeight: 52,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  deleteReasonInput: {
    minHeight: 108,
    textAlignVertical: "top",
  },

  confirmDeleteInput: {
    borderColor: "rgba(255,107,107,0.34)",
  },

  helperText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.48)",
    marginTop: -2,
    marginBottom: 13,
  },

  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -1,
    marginBottom: 14,
  },

  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F4B547",
  },

  requirementText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.54)",
  },

  primaryButton: {
    minHeight: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FF7A00",
    borderWidth: 1,
    borderColor: "#FFB24D",
    shadowColor: "#FF7A00",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.82,
  },

  buttonDisabled: {
    opacity: 0.58,
  },

  futureSecurityCard: {
    backgroundColor: "rgba(10,24,38,0.98)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.18)",
    padding: 16,
    marginBottom: 14,
  },

  futureSecurityTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },

  futureSecurityKicker: {
    flex: 1,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.25,
    color: "#F4B547",
  },

  futureBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.28)",
    backgroundColor: "rgba(244,181,71,0.06)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  futureBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "rgba(244,181,71,0.78)",
  },

  futureSecurityTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 5,
  },

  futureSecurityText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    color: "rgba(255,255,255,0.54)",
  },

  dangerCard: {
    backgroundColor: "rgba(37,15,19,0.72)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.34)",
    padding: 16,
    marginBottom: 14,
  },

  dangerKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    color: "#FF8F8F",
    marginBottom: 6,
  },

  dangerTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  dangerText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    color: "rgba(255,255,255,0.64)",
    marginBottom: 16,
  },

  deleteWarning: {
    backgroundColor: "rgba(255,107,107,0.055)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.18)",
    padding: 12,
    marginBottom: 14,
  },

  deleteWarningTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFAAAA",
    marginBottom: 4,
  },

  deleteWarningText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.56)",
  },

  deleteButton: {
    minHeight: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#A72A2A",
    borderWidth: 1,
    borderColor: "rgba(255,143,143,0.58)",
  },

  deleteButtonPressed: {
    opacity: 0.82,
  },

  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  backButton: {
    minHeight: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  backButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  backButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "800",
  },
});
