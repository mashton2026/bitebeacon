import { View } from "react-native";
import AppText from "../../components/AppText";

export default function MarketplaceScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#07131F",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <AppText
        variant="heading"
        style={{
          color: "#FFE29A",
          fontSize: 26,
          textAlign: "center",
        }}
      >
        THE TRADER'S EXCHANGE
      </AppText>

      <AppText
        variant="body"
        style={{
          color: "rgba(255,255,255,0.65)",
          textAlign: "center",
          marginTop: 12,
        }}
      >
        Good equipment deserves another shift.
      </AppText>
    </View>
  );
}