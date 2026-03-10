import { usePathname, useRouter } from 'expo-router';
import React, { PropsWithChildren, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useSupabase } from '../providers/SupabaseProvider';

type NavItem = { to: string; label: string };

export function MainLayout({ children }: PropsWithChildren) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const { session, client } = useSupabase();

  const navItems = (t('navigation.items', { returnObjects: true }) || []) as NavItem[];

  const mappedNavItems = navItems.map((item) => ({
    ...item,
    to: item.to === '/' ? '/' : item.to,
  }));

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/' || pathname === '/(tabs)';
    return pathname.startsWith(to);
  };

  const navigate = (to: string) => {
    setMenuOpen(false);
    if (to === '/') {
      router.push('/');
    } else {
      router.push(to as any);
    }
  };

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Pressable style={styles.brand} onPress={() => navigate('/')}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>RP</Text>
            </View>
            <Text style={styles.brandName}>ReservaPro</Text>
          </Pressable>

          {/* Desktop nav */}
          {Platform.OS === 'web' ? (
            <View style={styles.desktopNav}>
              {mappedNavItems.map((item) => (
                <Pressable key={item.to} onPress={() => navigate(item.to)}>
                  <Text style={[styles.navLink, isActive(item.to) && styles.navLinkActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.headerRight}>
            <Pressable style={styles.langBtn} onPress={toggleLang}>
              <Text style={styles.langText}>{i18n.language === 'es' ? 'ES' : 'EN'}</Text>
              <Text style={styles.langCaret}>▾</Text>
            </Pressable>

            {Platform.OS === 'web' ? (
              session ? (
                <Pressable style={styles.signInBtn} onPress={() => navigate('/auth')}>
                  <Text style={styles.signInText} numberOfLines={1}>
                    {session.user?.email?.split('@')[0] ?? t('navigation.signIn')}
                  </Text>
                </Pressable>
              ) : (
                <Pressable style={styles.signInBtn} onPress={() => navigate('/auth')}>
                  <Text style={styles.signInText}>{t('navigation.signIn')}</Text>
                </Pressable>
              )
            ) : (
              <Pressable onPress={() => setMenuOpen(!menuOpen)} style={styles.hamburger}>
                <Text style={styles.hamburgerText}>{menuOpen ? '✕' : '☰'}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Mobile menu */}
        {menuOpen && Platform.OS !== 'web' ? (
          <View style={styles.mobileMenu}>
            {mappedNavItems.map((item) => (
              <Pressable key={item.to} style={styles.mobileMenuItem} onPress={() => navigate(item.to)}>
                <Text style={[styles.mobileMenuText, isActive(item.to) && styles.mobileMenuActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
            <Pressable style={styles.mobileMenuItem} onPress={() => navigate('/auth')}>
              <Text style={styles.mobileMenuText}>
                {session ? session.user?.email?.split('@')[0] : t('navigation.signIn')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsHorizontalScrollIndicator={false}
        bounces={true}
      >
        {children}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>ReservaPro</Text>
          <Text style={styles.footerDesc}>{t('footer.description')}</Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => navigate('/reservations/options')}>
              <Text style={styles.footerLink}>{t('footer.links.experiences')}</Text>
            </Pressable>
            <Pressable onPress={() => navigate('/reservations/new')}>
              <Text style={styles.footerLink}>{t('footer.links.plan')}</Text>
            </Pressable>
            <Pressable onPress={() => navigate('/reservations/status')}>
              <Text style={styles.footerLink}>{t('footer.links.status')}</Text>
            </Pressable>
            <Pressable onPress={() => navigate('/auth')}>
              <Text style={styles.footerLink}>{t('footer.links.concierge')}</Text>
            </Pressable>
          </View>
          <Text style={styles.copy}>© {new Date().getFullYear()} ReservaPro. {t('footer.copyright')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, maxWidth: '100%', overflow: 'hidden' },
  header: { borderBottomWidth: 1, borderBottomColor: Colors.white10 },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  brandName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  desktopNav: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  navLink: { color: Colors.white80, fontSize: 14, fontWeight: '500' },
  navLinkActive: { color: '#fff', fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.white20,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langText: { color: Colors.white80, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  langCaret: { color: Colors.white50, fontSize: 10 },
  signInBtn: {
    borderWidth: 1,
    borderColor: Colors.white20,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signInText: { color: Colors.white80, fontSize: 14, fontWeight: '600' },
  hamburger: { padding: 8 },
  hamburgerText: { color: '#fff', fontSize: 22 },
  mobileMenu: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white10,
  },
  mobileMenuItem: { paddingVertical: 10 },
  mobileMenuText: { color: Colors.white80, fontSize: 16, fontWeight: '500' },
  mobileMenuActive: { color: '#fff', fontWeight: '700' },
  content: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { flexGrow: 1, maxWidth: '100%' },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.white10,
  },
  footerTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footerDesc: { color: Colors.white50, marginTop: 6, fontSize: 14, lineHeight: 20 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  footerLink: { color: Colors.white60, fontSize: 14 },
  copy: { color: Colors.white40, marginTop: 16, fontSize: 12 },
});

export default MainLayout;
