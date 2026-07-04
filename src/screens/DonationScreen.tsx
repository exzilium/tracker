import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { colors, typography } from '../theme';
import { AppAlert } from '../utils/AppAlert';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const itemSKUs = Platform.select({
  ios: ['tip_tier_1', 'tip_tier_2'],
  android: ['tip_tier_1', 'tip_tier_2'],
}) || [];

export default function DonationScreen({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isExpoGo);

  useEffect(() => {
    if (isExpoGo) return;

    let RNIap: any;
    try {
      RNIap = require('react-native-iap');
    } catch (e) {
      setLoading(false);
      return;
    }

    const initIAP = async () => {
      try {
        await RNIap.initConnection();
        const availableProducts = await RNIap.getProducts({ skus: itemSKUs });
        setProducts(availableProducts);
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };
    initIAP();

    return () => {
      if (RNIap) RNIap.endConnection();
    };
  }, []);

  const handlePurchase = async (sku: string) => {
    if (isExpoGo) {
      AppAlert('Simulated Purchase', 'This is a mocked purchase because you are running in Expo Go! 🍻');
      return;
    }

    try {
      const RNIap = require('react-native-iap');
      await RNIap.requestPurchase({ sku });
      AppAlert('Success!', 'Thank you for the beer! 🍻');
    } catch (err: any) {
      console.warn(err.code, err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Tip Jar</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.emoji}>🍻</Text>
        <Text style={styles.bodyText}>
          If this app helped you pace yourself and stay safe, consider dropping a tip in the jar to support future development!
        </Text>

        {isExpoGo ? (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Text style={[styles.errorText, { marginBottom: 16 }]}>Store connection mocked in Expo Go.</Text>
            <TouchableOpacity style={styles.tipBtn} onPress={() => handlePurchase('mock')}>
              <Text style={styles.tipBtnText}>Simulate $0.99 Tip</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }}/>
        ) : products.length === 0 ? (
          <Text style={styles.errorText}>Store currently unavailable.</Text>
        ) : (
          products.map((product) => (
            <TouchableOpacity 
              key={product.productId} 
              style={styles.tipBtn}
              onPress={() => handlePurchase(product.productId)}
            >
              <Text style={styles.tipBtnText}>Tip {product.localizedPrice}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 24,
  },
  backBtn: {
    marginRight: 16,
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  backBtnText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  header: {
    ...typography.h1,
    color: colors.text,
  },
  content: {
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  tipBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  tipBtnText: {
    color: colors.background,
    ...typography.body,
    fontWeight: 'bold',
  },
  errorText: {
    color: colors.error,
    ...typography.caption,
    marginTop: 20,
  },
});
