import { Image, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Burger Beacon</Text>
      <Text style={styles.subtitle}>No.1 app for all your streetfood needs</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Find local food vans</Text>
        <Text style={styles.cardText}>
          Discover burger vans, street food traders, and pop-up vendors near you.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Track live locations</Text>
        <Text style={styles.cardText}>
          See who is nearby, what they are serving, and where to go next.
        </Text>
      </View>
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
  logo: {
    width: 160,
    height: 160,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#E53935',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 28,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
});
