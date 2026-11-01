import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let mobileAds: any;
let BannerAd: any;
let BannerAdSize: any;
let TestIds: any;
let MaxAdContentRating: any;

if (!isExpoGo) {
  try {
    const Ads = require('react-native-google-mobile-ads');
    mobileAds = Ads.default;
    BannerAd = Ads.BannerAd;
    BannerAdSize = Ads.BannerAdSize;
    TestIds = Ads.TestIds;
    MaxAdContentRating = Ads.MaxAdContentRating;
  } catch (e) {
    console.warn('Failed to load Google Mobile Ads', e);
  }
}

const PROD_AD_UNIT_ID = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
  android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
});

export default function AdBanner() {
  const [adsReady, setAdsReady] = useState(false);

  useEffect(() => {
    if (isExpoGo || !mobileAds) return;

    let mounted = true;
    const initAds = async () => {
      try {
        if (MaxAdContentRating) {
          await mobileAds().setRequestConfiguration({
            maxAdContentRating: MaxAdContentRating.MA,
            tagForChildDirectedTreatment: false,
            tagForUnderAgeOfConsent: false,
          });
        }
        await mobileAds().initialize();
        if (mounted) setAdsReady(true);
      } catch (e) {
        console.warn('Failed to initialize Google Mobile Ads', e);
      }
    };

    initAds();
    return () => {
      mounted = false;
    };
  }, []);

  if (isExpoGo || !BannerAd || !adsReady) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={styles.placeholderText}>AdMob Banner Placeholder</Text>
      </View>
    );
  }

  const unitId = __DEV__ || !PROD_AD_UNIT_ID ? TestIds.BANNER : PROD_AD_UNIT_ID;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={unitId}
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
