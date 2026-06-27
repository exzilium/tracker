import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AdBanner() {
  return (
    <View style={[styles.container, styles.placeholder]}>
      <Text style={styles.placeholderText}>AdMob Banner (Mocked for Web)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 16 },
  placeholder: { 
    width: 320, 
    height: 50, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.3)', 
    borderStyle: 'dashed' 
  },
  placeholderText: { color: '#888', fontSize: 12 },
});
