import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { theme } from "../../constants/theme";
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>SECURITY</Text>
      <Text style={styles.title}>Login & Security</Text>
      <Text style={styles.subtitle}>
        Update the email and password connected to your BiteBeacon account.
      </Text>

      <Text style={styles.sectionTitle}>Email Address</Text>
      <Text style={styles.helperText}>
        Current: {currentEmail ?? "No account loaded"}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter new email"
        placeholderTextColor="#7A7A7A"
        autoCapitalize="none"
        keyboardType="email-address"
        value={newEmail}
        onChangeText={setNewEmail}
      />

      <Pressable
        style={[
          styles.primaryButton,
          isUpdatingEmail && styles.buttonDisabled,
        ]}
        onPress={handleUpdateEmail}
        disabled={isUpdatingEmail}
      >
        <Text style={styles.primaryButtonText}>
          {isUpdatingEmail ? "Updating..." : "Update Email"}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Password</Text>

      <TextInput
        style={styles.input}
        placeholder="New password"
        placeholderTextColor="#7A7A7A"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor="#7A7A7A"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Text style={styles.helperText}>Use at least 8 characters.</Text>

      <Pressable
        style={[
          styles.primaryButton,
          isUpdatingPassword && styles.buttonDisabled,
        ]}
        onPress={handleUpdatePassword}
        disabled={isUpdatingPassword}
      >
        <Text style={styles.primaryButtonText}>
          {isUpdatingPassword ? "Updating..." : "Update Password"}
        </Text>
      </Pressable>

      <Text style={styles.dangerTitle}>Account Deletion</Text>
      <Text style={styles.dangerText}>
        You can request permanent account deletion. Your account will be deleted after verification.
        In some cases, BiteBeacon may retain limited data where required for legal, security, fraud-prevention,
        billing, dispute-resolution, or platform integrity reasons.
      </Text>

      <TextInput
        style={[styles.input, styles.deleteReasonInput]}
        placeholder="Optional reason for deletion request"
        placeholderTextColor="#7A7A7A"
        multiline
        maxLength={300}
        value={deleteReason}
        onChangeText={setDeleteReason}
      />

      <Text style={styles.helperText}>
        Type DELETE below to confirm this request. You can also contact support if you need help with account deletion.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Type DELETE"
        placeholderTextColor="#7A7A7A"
        autoCapitalize="characters"
        value={deleteConfirmText}
        onChangeText={setDeleteConfirmText}
      />

      <Pressable
        style={[
          styles.deleteButton,
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

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.textOnDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 24,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
    marginTop: 16,
  },
  helperText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    color: "#222222",
  },
  deleteReasonInput: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFB3B3",
    marginTop: 18,
    marginBottom: 8,
  },
  dangerText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 21,
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: "#C62828",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  backButton: {
    marginTop: 20,
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