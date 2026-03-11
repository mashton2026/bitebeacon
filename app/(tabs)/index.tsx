import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import BurgerVanCard from '../../components/BurgerVanCard';
import { mockVans } from '../../constants/mockVans';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={mockVans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Burger Beacon</Text>
            <Text style={styles.subtitle}>
              Discover the best street food traders near you.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BurgerVanCard
            name={item.name}
            cuisine={item.cuisine}
            rating={item.rating}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4F2',
  },
  listContent: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#E53935',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    maxWidth: 280,
  },
});
