import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../constants/theme";
import { type AppSettings } from "../services/appSettingsService";

const CURRENT_ANDROID_VERSION = 1;

type Props = {
  settings: AppSettings | null;
};

export default function AppUpdateBanner({ settings }: Props) {
  if (!settings) return null;

  const needsUpdate =
    CURRENT_ANDROID_VERSION < settings.latest_android_version;

  if (!needsUpdate) return null;

  function openStore() {
    if (!settings?.play_store_url) return;
    Linking.openURL(settings.play_store_url);
  }

  return (
    <View style={styles.banner}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Update available</Text>
        <Text style={styles.message}>{settings.update_message}</Text>
      </View>

      {settings.play_store_url ? (
        <Pressable style={styles.button} onPress={openStore}>
          <Text style={styles.buttonText}>Update</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "rgba(255,122,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.35)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  textWrap: {
    flex: 1,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3,
  },

  message: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },

  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});