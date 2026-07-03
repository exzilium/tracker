import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';
import { AppAlert } from '../utils/AppAlert';

export default function DonationScreen({ navigation }: any) {
  const handlePurchase = () => {
    AppAlert('Simulated', 'This is a simulated purchase for Web! 🍻');
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
        <View style={{ width: '100%', alignItems: 'center' }}>
          <Text style={[styles.errorText, { marginBottom: 16 }]}>Store connection mocked in Web.</Text>
          <TouchableOpacity style={styles.tipBtn} onPress={handlePurchase}>
            <Text style={styles.tipBtnText}>Simulate $0.99 Tip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, marginBottom: 24 },
  backBtn: { marginRight: 16, padding: 8, backgroundColor: colors.surface, borderRadius: 8 },
  backBtnText: { color: colors.text, fontWeight: 'bold' },
  header: { ...typography.h1, color: colors.primary },
  content: { paddingHorizontal: 32, alignItems: 'center', marginTop: 40 },
  emoji: { fontSize: 80, marginBottom: 24 },
  bodyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  tipBtn: { backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, marginBottom: 16, width: '100%', alignItems: 'center' },
  tipBtnText: { color: colors.background, ...typography.body, fontWeight: 'bold' },
  errorText: { color: colors.error, ...typography.caption, marginTop: 20 },
});
