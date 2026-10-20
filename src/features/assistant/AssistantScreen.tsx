import { FlowScope } from '../../navigation/Navigation';
import React, { useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge, Button, Card, Icon, IconButton, IconName, IconTile, Row, Section, T } from '../../shared/components';
import { C, F, S } from '../../shared/theme';
import { useApp } from '../../store/model';
import AIPlanFlow from './AIPlanFlow';
import AIDocumentFlow from './AIDocumentFlow';

const features: { icon: IconName; title: string; description: string; action: string; color: string; bg: string }[] = [
  { icon: 'alarm-outline', title: 'Kế hoạch ôn thi theo deadline', description: 'Chia mục tiêu lớn thành những phiên học vừa sức, bắt đầu từ bài cần ưu tiên.', action: 'Tạo lộ trình', color: C.primary, bg: C.soft },
  { icon: 'calendar-outline', title: 'Lịch học theo thời gian rảnh', description: 'Tìm một khoảng trống giữa những ca học để tập trung mà vẫn có thời gian nghỉ.', action: 'Tìm lịch trống', color: C.primary, bg: C.soft },
  { icon: 'document-text-outline', title: 'Tóm tắt PDF & giáo trình', description: 'Nắm ý chính, công thức và những nội dung cần đọc lại, kèm tham chiếu nguồn.', action: 'Xem bản mẫu', color: C.red, bg: C.redSoft },
  { icon: 'help-circle-outline', title: 'Tạo câu hỏi trắc nghiệm', description: 'Tự kiểm tra kiến thức với câu hỏi ngắn và lời giải thích cho từng lựa chọn.', action: 'Luyện thử', color: C.green, bg: C.greenSoft },
  { icon: 'analytics-outline', title: 'Điều chỉnh kế hoạch học', description: 'Chọn một buổi chưa bắt đầu, xem giờ mới phù hợp và duyệt thay đổi.', action: 'Xem đề xuất', color: C.primary, bg: C.soft },
];
export default function Assistant({ onStudyPlan }: { onStudyPlan: () => void }) {
  const { tasks, setTab } = useApp();
  const [feature, setFeature] = useState<number | null>(null); const [prompt, setPrompt] = useState(''); const [sent, setSent] = useState('');
  const pending = tasks.filter(t => t.status !== 'Hoàn thành').sort((a, b) => a.deadline.localeCompare(b.deadline));
  const firstTask = pending[0];
  const send = () => { if (!prompt.trim()) return; setSent(prompt.trim()); setPrompt(''); setFeature(0); };
  return <FlowScope onClose={() => setFeature(null)}>
    <LinearGradient colors={['#7862EA', '#5341CD', '#7865DE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 23, borderRadius: 32, gap: 20, boxShadow: '0px 12px 24px rgba(108,92,231,0.18)' }}>
      <Badge label="Trợ lý học tập • Bản xem trước" bg="#FFFFFF26" color="#fff" icon="sparkles" />
      <Row style={{ gap: 12 }}><View style={S.grow}><T style={{ color: '#fff', fontFamily: F.extra, fontSize: 24, lineHeight: 34, letterSpacing: -0.8 }}>Hôm nay, mình cùng học gì nhé?</T><T style={{ color: '#E9E2FF', fontSize: 12, lineHeight: 21, marginTop: 8 }}>Một kế hoạch vừa sức. Một chút tập trung. Thêm nhiều tiến bộ mỗi ngày.</T></View><Image source={require('../../../assets/mentor.png')} style={{ width: 84, height: 95, borderRadius: 23 }} /></Row>
      <Row style={{ borderTopWidth: 1, borderTopColor: '#FFFFFF28', paddingTop: 16 }}>{[{ value: '5', label: 'Công cụ học tập' }, { value: 'Của bạn', label: 'Quyền quyết định' }, { value: 'Từng bước', label: 'Cách tiến bộ' }].map(s => <View key={s.label} style={{ flex: 1, alignItems: 'center', gap: 3 }}><T style={{ color: '#fff', fontFamily: F.bold, fontSize: 14 }}>{s.value}</T><T style={{ color: '#E9E2FF', fontSize: 9 }}>{s.label}</T></View>)}</Row>
    </LinearGradient>
    <Card style={{ gap: 12 }}><Row style={{ gap: 12 }}><IconTile name="bulb-outline" /><View style={S.grow}><T style={{ color: C.primary, fontSize: 10, fontFamily: F.bold, letterSpacing: 1 }}>GỢI Ý HÔM NAY</T><T style={{ fontFamily: F.bold, fontSize: 14, marginTop: 4 }}>{pending.length ? 'Bắt đầu từ một bài tập sắp đến hạn' : 'Dành một phiên để ôn lại bài'}</T><T style={{ color: C.muted, fontSize: 12, lineHeight: 20, marginTop: 4 }}>{firstTask?.title ?? 'Hôm nay bạn đã làm rất tốt. Một phiên ngắn sẽ giúp ghi nhớ lâu hơn.'}</T></View></Row><Row><Button label="Xem kế hoạch" icon="sparkles-outline" onPress={() => { setSent(''); setFeature(0); }} style={S.grow} /><Button label="Tự tập trung" secondary onPress={() => setTab('focus')} /></Row></Card>
    <Section title="5 công cụ học tập" icon="sparkles-outline" />
    {features.map((f, i) => <Pressable key={f.title} accessibilityRole="button" accessibilityLabel={f.action} onPress={() => { setSent(''); setFeature(i); }}><Card style={{ gap: 13 }}><Row style={{ alignItems: 'flex-start', gap: 13 }}><IconTile name={f.icon} color={f.color} bg={f.bg} /><View style={[S.grow, { gap: 5 }]}><T style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 23 }}>{f.title}</T><T style={{ color: C.muted, fontSize: 12, lineHeight: 20 }}>{f.description}</T></View></Row><Row between style={{ marginLeft: 57 }}><T style={{ color: C.muted, fontSize: 10 }}>Khám phá bản mẫu</T><Row><T style={{ color: C.primary, fontFamily: F.semi, fontSize: 12 }}>{f.action}</T><Icon name="chevron-forward" size={14} /></Row></Row></Card></Pressable>)}
    <Section title="Bắt đầu bằng một câu hỏi" />
    <View style={{ gap: 8 }}>{['Lập kế hoạch ôn thi tuần này', 'Giúp mình ưu tiên bài tập'].map(q => <Pressable key={q} onPress={() => { setSent(q); setFeature(0); }} accessibilityRole="button" style={{ backgroundColor: '#fff', minHeight: 44, borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="chatbubble-outline" size={16} /><T style={{ fontSize: 12 }}>{q}</T></Pressable>)}</View>
    <Card style={{ padding: 10 }}><Row><TextInput maxLength={120} value={prompt} onChangeText={setPrompt} onSubmitEditing={send} returnKeyType="send" accessibilityLabel="Câu hỏi cho trợ lý" placeholder="Bạn đang muốn học gì?" placeholderTextColor={C.muted} style={{ flex: 1, minWidth: 0, padding: 9, fontFamily: F.regular, fontSize: 13, color: C.ink }} /><IconButton name="send" label="Gửi câu hỏi" bg={C.primary} color="#fff" onPress={send} /></Row></Card>
    <T style={{ textAlign: 'center', fontSize: 11, lineHeight: 18, color: C.muted }}>Đang dùng đề xuất mẫu để bạn trải nghiệm giao diện.{"\n"}Bạn luôn xem và chọn trước khi thêm vào kế hoạch.</T>
    {(feature === 0 || feature === 1 || feature === 4) && <AIPlanFlow variant={feature === 4 ? 'adjust' : feature === 1 ? 'free' : 'deadline'} request={sent} onClose={() => setFeature(null)} onStudyPlan={onStudyPlan} />}
    {(feature === 2 || feature === 3) && <AIDocumentFlow initialMode={feature === 2 ? 'summary' : 'quiz'} onClose={() => setFeature(null)} />}
  </FlowScope>;
}
