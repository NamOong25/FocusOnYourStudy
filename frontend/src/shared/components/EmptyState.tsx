import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { C, F } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import type { IconName } from './Icon';
import { T } from './Typography';

const illustrations = {
  books: require('../../../assets/empty-states/books.png'),
  assignments: require('../../../assets/empty-states/assignments.png'),
  focus: require('../../../assets/empty-states/focus.png'),
};

type Props = {
  title: string;
  message?: string;
  illustration?: keyof typeof illustrations;
  actionLabel: string;
  actionIcon?: IconName;
  onAction: () => void;
};

export function EmptyState({ title, message, illustration, actionLabel, actionIcon, onAction }: Props) {
  return <Card style={[styles.card, !illustration && styles.compact]}>
    {illustration && <Image source={illustrations[illustration]} resizeMode="contain" style={styles.image}
      accessible={false} accessibilityElementsHidden importantForAccessibility="no" />}
    <T accessibilityRole="header" accessibilityLiveRegion="polite"
      style={[styles.title, !illustration && styles.compactTitle]}>{title}</T>
    {message && <T style={styles.message}>{message}</T>}
    <Button label={actionLabel} icon={actionIcon} onPress={onAction} secondary={!illustration}
      style={illustration ? styles.primaryAction : styles.compactAction} />
  </Card>;
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 8 },
  compact: { paddingVertical: 14, gap: 5, backgroundColor: C.canvas },
  image: { width: 128, height: 116, maxWidth: '100%', marginBottom: 3 },
  title: { fontFamily: F.extra, fontSize: 19, textAlign: 'center' },
  compactTitle: { fontFamily: F.bold, fontSize: 14 },
  message: { fontSize: 13, color: C.muted, textAlign: 'center', maxWidth: 290 },
  primaryAction: { alignSelf: 'stretch', minHeight: 44, borderRadius: 15, marginTop: 6 },
  compactAction: { minHeight: 44, borderRadius: 14, marginTop: 3 },
});
