import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MainLayout from '../src/components/MainLayout';
import { Colors } from '../src/constants/colors';
import { useTranslation } from 'react-i18next';

export default function ContactPage() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <View style={styles.container}>
        <Text style={styles.title}>{t('contact.title')}</Text>
        <Text style={styles.desc}>{t('contact.description')}</Text>

        <View style={styles.grid}>
          <Pressable style={styles.card} onPress={() => Linking.openURL('https://wa.me/50660001111')}>
            <Text style={styles.cardLabel}>WhatsApp</Text>
            <Text style={styles.cardValue}>+506 6000-1111</Text>
            <Text style={styles.cardHint}>{t('contact.whatsappHint')}</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => Linking.openURL('mailto:reservapro@gmail.com')}>
            <Text style={styles.cardLabel}>Email</Text>
            <Text style={styles.cardValue}>reservapro@gmail.com</Text>
            <Text style={styles.cardHint}>{t('contact.emailHint')}</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => Linking.openURL('tel:+50622223333')}>
            <Text style={styles.cardLabel}>Tel</Text>
            <Text style={styles.cardValue}>+506 2222-3333</Text>
            <Text style={styles.cardHint}>{t('contact.phoneHint')}</Text>
          </Pressable>
        </View>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 32 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  desc: { color: Colors.white70, fontSize: 15, lineHeight: 22, marginBottom: 24 },
  grid: { gap: 14 },
  card: {
    borderWidth: 1,
    borderColor: Colors.white10,
    backgroundColor: Colors.white10,
    borderRadius: 20,
    padding: 16,
  },
  cardLabel: { color: Colors.white50, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  cardValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 8 },
  cardHint: { color: Colors.white60, fontSize: 13, marginTop: 8 },
});
