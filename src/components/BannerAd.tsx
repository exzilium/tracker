import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let BannerAd: any;
let BannerAdSize: any;
let TestIds: any;

if (!isExpoGo) {
  try {
    const Ads = require('react-native-google-mobile-ads');
    BannerAd = Ads.BannerAd;
    BannerAdSize = Ads.BannerAdSize;
    TestIds = Ads.TestIds;
  } catch (e) {
    console.warn("Failed to load Google Mobile Ads", e);
  }
}

export default function AdBanner() {
  if (isExpoGo || !BannerAd) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={styles.placeholderText}>AdMob Banner Placeholder</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={TestIds.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  placeholder: {
    width: 320,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#888',
    fontSize: 12,
  },
});
