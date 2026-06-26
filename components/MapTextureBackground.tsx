import { StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

type Props = {
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
};

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#071421" }] },
  { elementType: "labels", stylers: [{ visibility: "off" }] },

  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#3E5876" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#102235" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#374D68" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#4C6687" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#5B789D" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1C3147" }],
  },

  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#061A2A" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#0E2434" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0B3029" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#071421" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
];

export default function MapTextureBackground({ userLocation }: Props) {
  const center = userLocation ?? {
    latitude: 50.266,
    longitude: -5.0527,
  };

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <MapView
        provider={PROVIDER_GOOGLE}
        pointerEvents="none"
        style={styles.map}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: 0.09,
          longitudeDelta: 0.055,
        }}
        region={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: 0.09,
          longitudeDelta: 0.055,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={{
            latitude: center.latitude + 0.012,
            longitude: center.longitude - 0.012,
          }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.pinOrange} />
        </Marker>

        <Marker
          coordinate={{
            latitude: center.latitude - 0.014,
            longitude: center.longitude + 0.015,
          }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.pinGreen} />
        </Marker>

        <Marker
          coordinate={{
            latitude: center.latitude + 0.022,
            longitude: center.longitude + 0.018,
          }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.pinBlue} />
        </Marker>

        <Marker
          coordinate={{
            latitude: center.latitude - 0.025,
            longitude: center.longitude - 0.018,
          }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.pinOrange} />
        </Marker>

        <Marker
          coordinate={{
            latitude: center.latitude + 0.006,
            longitude: center.longitude + 0.028,
          }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.pinGreen} />
        </Marker>
      </MapView>

      <View style={styles.darkOverlay} />
      <View style={styles.blueTint} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#071421",
    overflow: "hidden",
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 10, 20, 0.53)",
  },

  blueTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 28, 55, 0.18)",
  },

  pinOrange: {
    width: 18,
    height: 18,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: "rgba(4, 14, 28, 0.75)",
    backgroundColor: "#FF7A00",
    transform: [{ rotate: "45deg" }],
  },

  pinGreen: {
    width: 18,
    height: 18,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: "rgba(4, 14, 28, 0.75)",
    backgroundColor: "#1DB954",
    transform: [{ rotate: "45deg" }],
  },

  pinBlue: {
    width: 18,
    height: 18,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: "rgba(4, 14, 28, 0.75)",
    backgroundColor: "#2F80ED",
    transform: [{ rotate: "45deg" }],
  },
});