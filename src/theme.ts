import { StyleSheet } from 'react-native';

export const C = {
  primary: '#5341CD', purple: '#6C5CE7', lavender: '#A29BFE', soft: '#E8E2FF',
  canvas: '#F4FAFD', card: '#FFFFFF', ink: '#20282B', muted: '#737383',
  line: '#EBEDF5', track: '#EAF0F3', green: '#008F70', greenSoft: '#DDF9ED',
  red: '#C72632', redSoft: '#FFE1DE', amber: '#A86600', amberSoft: '#FFF2D7',
  blue: '#2879B5', blueSoft: '#E5F3FF',
};
export const F = { regular: 'Jakarta', medium: 'JakartaMedium', semi: 'JakartaSemi', bold: 'JakartaBold', extra: 'JakartaExtra' };
export const S = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  stack: { gap: 16 },
  card: { backgroundColor: C.card, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#F0F0FA', boxShadow: '0px 4px 18px rgba(92, 78, 170, 0.035)' },
  title: { fontFamily: F.bold, fontSize: 19, lineHeight: 28, color: C.ink, letterSpacing: -0.5 },
  small: { fontFamily: F.regular, fontSize: 12, lineHeight: 19, color: C.muted },
  body: { fontFamily: F.regular, fontSize: 14, lineHeight: 22, color: C.ink },
});
