import { StyleSheet, Text, View } from 'react-native';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Burger Van Map</Text>
      <Text style={styles.subtitle}>
        Your live vendor map will go here next.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#E53935',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
});
