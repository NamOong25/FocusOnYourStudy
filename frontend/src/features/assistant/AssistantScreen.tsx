import React, { useState } from 'react';
import { Image, Pressable, useWindowDimensions, View } from 'react-native';
import { FlowScope } from '../../navigation/Navigation';
import { Badge, Card, Icon, IconTile, Row, T, type IconName } from '../../shared/components';
import { C, F, S } from '../../shared/theme';
import { useAuth } from '../account/auth/AuthProvider';
import AIDocumentFlow from './AIDocumentFlow';
import AIPlanFlow from './AIPlanFlow';

const planActions = [
  { id: 'deadline', icon: 'alarm-outline', title: 'Ôn theo hạn', description: 'Theo bài tập hoặc lịch thi', label: 'Tạo kế hoạch' },
  { id: 'free', icon: 'calendar-outline', title: 'Tìm giờ trống', description: 'Xếp buổi tự học theo lịch', label: 'Tìm lịch' },
] as const;

type Feature = typeof planActions[number]['id'] | 'adjust' | 'summary' | 'quiz';

export default function Assistant({ onStudyPlan }: { onStudyPlan: (date?: string) => void }) {
  const { hasSession } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const [feature, setFeature] = useState<Feature | null>(null);
  const [showSamples, setShowSamples] = useState(false);
  const stack = width < 320 || fontScale >= 1.3;
  const close = () => setFeature(null);
  const adjust = () => {
    if (hasSession) onStudyPlan();
    else setFeature('adjust');
  };

  return <FlowScope onClose={close}>
    <T accessibilityRole="header" style={{ fontFamily: F.extra, fontSize: 28, lineHeight: 39, letterSpacing: -0.7 }}>Trợ lý AI</T>
    <Card style={{ backgroundColor: C.soft, padding: 16 }}>
      <Row style={{ gap: 10 }}>
        <View style={[S.grow, { gap: 6 }]}>
          <Badge label={hasSession ? 'DỰA TRÊN LỊCH CỦA BẠN' : 'LỊCH MẪU'} bg={C.card} />
          <T accessibilityRole="header" style={{ fontFamily: F.extra, fontSize: 21, lineHeight: 29 }}>Lên kế hoạch học</T>
          <T style={S.small}>Tìm giờ trống và xem trước các buổi học trước khi lưu.</T>
        </View>
        {!stack && <Image source={require('../../../assets/mentor.png')} accessible={false}
          resizeMode="cover" style={{ width: width < 360 ? 68 : 88, height: width < 360 ? 80 : 100, borderRadius: 20 }} />}
      </Row>
    </Card>

    <T accessibilityRole="header" style={S.title}>Bạn muốn làm gì?</T>
    <View style={{ flexDirection: stack ? 'column' : 'row', alignItems: 'stretch', gap: 10 }}>
      {planActions.map(action => <Pressable key={action.id} accessibilityRole="button" accessibilityLabel={action.title}
        accessibilityHint={action.description} onPress={() => setFeature(action.id)}
        style={({ pressed }) => [S.card, S.grow, { padding: 12, gap: 8, backgroundColor: pressed ? C.soft : C.card }]}>
        <IconTile name={action.icon} size={42} />
        <View style={[S.grow, { gap: 4 }]}>
          <T style={{ fontFamily: F.bold, fontSize: 15 }}>{action.title}</T>
          <T style={S.small}>{action.description}</T>
        </View>
        <Row style={{ minHeight: 28, gap: 3 }}>
          <T style={[S.grow, { color: C.primary, fontFamily: F.bold, fontSize: 12 }]}>{action.label}</T>
          <Icon name="chevron-forward" size={14} />
        </Row>
      </Pressable>)}
    </View>

    <AssistantToolRow icon="options-outline" title="Điều chỉnh buổi học"
      description={hasSession ? 'Mở các buổi tự học đã lưu' : 'Thử đổi giờ cho một buổi học mẫu'} onPress={adjust} />
    <Row style={{ gap: 8, alignItems: 'flex-start', paddingHorizontal: 3 }}>
      <Icon name="information-circle-outline" size={17} />
      <T style={[S.grow, S.small]}>{hasSession
        ? 'Ứng dụng xếp buổi theo lịch và giờ rảnh. Bạn xem và duyệt trước khi thêm vào lịch.'
        : 'Bạn có thể xem và duyệt các đề xuất trên lịch mẫu.'}</T>
    </Row>

    <Card style={{ padding: 12, gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Công cụ dùng thử" accessibilityState={{ expanded: showSamples }}
        onPress={() => setShowSamples(value => !value)} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}>
        <Row style={{ gap: 8 }}>
          <IconTile name="flask-outline" size={36} />
          <View style={[S.grow, { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }]}>
            <T style={{ fontFamily: F.bold }}>Công cụ dùng thử</T>
            <Badge label="Bản mẫu" />
          </View>
          <Icon name={showSamples ? 'chevron-up' : 'chevron-down'} size={16} />
        </Row>
      </Pressable>
      {showSamples && <>
        <AssistantToolRow sample icon="document-text-outline" title="Tóm tắt tài liệu mẫu" onPress={() => setFeature('summary')} />
        <AssistantToolRow sample icon="help-circle-outline" title="Luyện trắc nghiệm mẫu" onPress={() => setFeature('quiz')} />
      </>}
    </Card>

    {(feature === 'deadline' || feature === 'free' || feature === 'adjust') &&
      <AIPlanFlow variant={feature} onClose={close} onStudyPlan={onStudyPlan} />}
    {(feature === 'summary' || feature === 'quiz') && <AIDocumentFlow initialMode={feature} onClose={close} />}
  </FlowScope>;
}

function AssistantToolRow({ icon, title, description, sample = false, onPress }: {
  icon: IconName; title: string; description?: string; sample?: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={description} onPress={onPress}
    style={({ pressed }) => [S.card, { minHeight: 52, padding: sample ? 8 : 12, justifyContent: 'center', backgroundColor: pressed ? C.soft : sample ? C.canvas : C.card }]}>
    <Row style={{ gap: 10 }}>
      <IconTile name={icon} size={sample ? 32 : 42} />
      <View style={[S.grow, { gap: 2 }]}>
        <T style={{ fontFamily: F.bold, fontSize: sample ? 13 : 15 }}>{title}</T>
        {description && <T style={S.small}>{description}</T>}
      </View>
      <Icon name="chevron-forward" size={16} />
    </Row>
  </Pressable>;
}
