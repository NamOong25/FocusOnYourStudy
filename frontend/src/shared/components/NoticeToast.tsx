import React, { useEffect, useId } from 'react';
import { View } from 'react-native';
import { useNavigationScope } from '../../navigation/Navigation';
import { useFeedback } from '../feedback/FeedbackProvider';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { T } from './Typography';

export function NoticeToast({ bottom = 16, modal = false }: { bottom?: number; modal?: boolean }) {
  const id = useId(), scope = useNavigationScope();
  const { notice, dismissNotice, registerHost, activeHost } = useFeedback();
  const priority = modal ? 100 + scope.depth : 0;
  useEffect(() => { if (scope.active) return registerHost(id, priority); }, [scope.active, id, priority, registerHost]);
  if (!notice || activeHost !== id || !scope.active) return null;
  return <View style={{ position: 'absolute', bottom, left: 16, right: 16, backgroundColor: '#29243E', borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Icon name="checkmark-circle-outline" color="#C9F9E1" size={22} />
    <T key={notice.id} accessibilityLiveRegion="polite" style={{ color: '#fff', fontSize: 12, flex: 1 }}>{notice.message}</T>
    <IconButton name="close" label="Đóng thông báo kết quả" onPress={dismissNotice} color="#fff" bg="transparent" />
  </View>;
}
