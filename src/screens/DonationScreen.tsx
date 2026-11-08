import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { colors, typography } from '../theme';
import { AppAlert } from '../utils/AppAlert';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const itemSKUs = Platform.select({
  ios: ['tip_tier_1', 'tip_tier_2'],
  android: ['tip_tier_1', 'tip_tier_2'],
}) || [];

interface StoreProduct {
  id?: string;
  productId?: string;
  displayPrice?: string;
  localizedPrice?: string;
}

export default function DonationScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(!isExpoGo);

  useEffect(() => {
    if (isExpoGo) return;

    let RNIap: any;
    try {
      RNIap = require('react-native-iap');
    } catch {
      setLoading(false);
      return;
    }

    let purchaseUpdateSub: { remove: () => void } | null = null;
    let purchaseErrorSub: { remove: () => void } | null = null;

    const initIAP = async () => {
      try {
        await RNIap.initConnection();

        if (typeof RNIap.purchaseUpdatedListener === 'function') {
          purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase: any) => {
            const sku = purchase?.productId || purchase?.id;
            if (!sku || !itemSKUs.includes(sku)) return;

            const isPending =
              purchase?.purchaseStateAndroid === 2 ||
              purchase?.transactionStateIOS === 'deferred' ||
              purchase?.transactionStateIOS === 'purchasing';
            if (isPending) return;

            const hasValidToken = Boolean(
              purchase?.purchaseToken || purchase?.transactionReceipt || purchase?.transactionId
            );
            if (!hasValidToken) return;

            try {
              await RNIap.finishTransaction({ purchase, isConsumable: true });
              AppAlert('Success!', 'Thank you for the beer! 🍻');
            } catch (finishErr) {
              console.warn('Failed to finish IAP transaction', finishErr);
            }
          });
        }

        if (typeof RNIap.purchaseErrorListener === 'function') {
          purchaseErrorSub = RNIap.purchaseErrorListener((error: any) => {
            if (error?.code && error.code !== 'E_USER_CANCELLED') {
              AppAlert('Purchase Failed', error.message || 'Unable to complete purchase.');
            }
          });
        }

        const availableProducts =
          typeof RNIap.fetchProducts === 'function'
            ? await RNIap.fetchProducts({ skus: itemSKUs, type: 'in-app' })
            : await RNIap.getProducts({ skus: itemSKUs });

        setProducts(Array.isArray(availableProducts) ? availableProducts : []);
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };
    initIAP();

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      if (RNIap && typeof RNIap.endConnection === 'function') {
        RNIap.endConnection();
      }
    };
  }, []);

  const handlePurchase = async (sku: string) => {
    if (isExpoGo) {
      AppAlert('Simulated Purchase', 'This is a mocked purchase because you are running in Expo Go! 🍻');
      return;
    }

    try {
      const RNIap = require('react-native-iap');
      await RNIap.requestPurchase({
        request: {
          apple: { sku },
          google: { skus: [sku] },
        },
        type: 'in-app',
      });
    } catch (err: any) {
      console.warn(err?.code, err?.message);
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
          products.map((product) => {
            const sku = product.id || product.productId || '';
            const price = product.displayPrice || product.localizedPrice || '';
            return (
              <TouchableOpacity 
                key={sku} 
                style={styles.tipBtn}
                onPress={() => handlePurchase(sku)}
              >
                <Text style={styles.tipBtnText}>Tip {price}</Text>
              </TouchableOpacity>
            );
          })
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
