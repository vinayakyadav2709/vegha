import React from 'react';
import { StyleSheet, View } from 'react-native';
import VehicleDetector from './src/components/VehicleDetector';

export default function App() {
  return (
    <View style={styles.container}>
      <VehicleDetector />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
