import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { LinearGradient } from "expo-linear-gradient";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { type AppSettings } from "../services/appSettingsService";

type Props = {
  settings: AppSettings | null;
};

const FALLBACK_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.bitebeacon.mobileapp";

export default function AppUpdateBanner({ settings }: Props) {
  // This banner currently supports Android releases.
  if (Platform.OS !== "android" || !settings) {
    return null;
  }

  // Read the actual installed Android version code.
  // Unlike app.json, this reflects the installed native build.
  const installedVersion = Number(Application.nativeBuildVersion);

  if (!Number.isFinite(installedVersion) || installedVersion <= 0) {
    return null;
  }

  const latestVersion = Number(settings.latest_android_version);
  const minimumVersion = Number(settings.minimum_android_version);

  if (!Number.isFinite(latestVersion)) {
    return null;
  }

  const needsUpdate = installedVersion < latestVersion;

  if (!needsUpdate) {
    return null;
  }

  const isRequired =
    Number.isFinite(minimumVersion) && installedVersion < minimumVersion;

  const storeUrl = settings.play_store_url?.trim() || FALLBACK_PLAY_STORE_URL;

  const updateMessage =
    settings.update_message?.trim() ||
    "A newer version of BiteBeacon is available on Google Play.";

  async function openStore() {
    try {
      await Linking.openURL(storeUrl);
    } catch (error) {
      console.warn("Unable to open Google Play:", error);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#FFF1B6", "#DCA63C", "#79501A", "#F5CB70", "#A36A20"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metallicBorder}
      >
        <LinearGradient
          colors={["#102C43", "#091D30", "#061321"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.topRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="update" size={23} color="#FFD77B" />
            </View>

            <View style={styles.textWrap}>
              <Text style={styles.eyebrow}>BITEBEACON UPDATE</Text>

              <Text style={styles.title}>
                {isRequired ? "Update required" : "Update available"}
              </Text>
            </View>

            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>NEW</Text>
            </View>
          </View>

          <Text style={styles.message}>{updateMessage}</Text>

          <View style={styles.divider} />

          <View style={styles.bottomRow}>
            <View style={styles.versionInfo}>
              <MaterialCommunityIcons
                name="cellphone-arrow-down"
                size={15}
                color="#F4B547"
              />

              <Text style={styles.versionText}>
                Version {installedVersion} → {latestVersion}
              </Text>
            </View>

            <Pressable
              onPress={openStore}
              accessibilityRole="button"
              accessibilityLabel="Update BiteBeacon on Google Play"
              style={({ pressed }) => [
                styles.buttonOuter,
                pressed && styles.buttonPressed,
              ]}
            >
              <LinearGradient
                colors={["#FFF4C5", "#FFD975", "#F2B63B", "#CE850F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>UPDATE</Text>

                <MaterialCommunityIcons
                  name="arrow-right"
                  size={17}
                  color="#071421"
                />
              </LinearGradient>
            </Pressable>
          </View>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    borderRadius: 20,

    shadowColor: "#F4B547",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 6,
  },

  metallicBorder: {
    padding: 1.5,
    borderRadius: 20,
  },

  banner: {
    borderRadius: 18.5,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 13,
    overflow: "hidden",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  iconContainer: {
    width: 43,
    height: 43,
    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(244,181,71,0.10)",

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.36)",
  },

  textWrap: {
    flex: 1,
  },

  eyebrow: {
    color: "#F4B547",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.7,
    marginBottom: 3,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  versionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 999,

    backgroundColor: "rgba(244,181,71,0.12)",

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.38)",
  },

  versionBadgeText: {
    color: "#FFD77B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  message: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 13,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(244,181,71,0.18)",
    marginTop: 14,
    marginBottom: 12,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  versionInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  versionText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 10,
    fontWeight: "600",
  },

  buttonOuter: {
    borderRadius: 12,

    shadowColor: "#FFB52E",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 4,
  },

  button: {
    minHeight: 39,
    borderRadius: 12,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 7,
    paddingHorizontal: 14,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },

  buttonText: {
    color: "#071421",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
