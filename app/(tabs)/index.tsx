import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MapScreen } from '../../src/features/map/screens/MapScreen';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <MapScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
