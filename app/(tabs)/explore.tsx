import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { mockVans } from '../../constants/mockVans';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 51.5074,
          longitude: -0.1278,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {mockVans.map((van) => (
          <Marker
            key={van.id}
            coordinate={{
              latitude: van.lat,
              longitude: van.lng,
            }}
            title={van.name}
            description={`${van.cuisine} • ⭐ ${van.rating}`}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
