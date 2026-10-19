import React, { useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge, Button, Card, Field, Icon, IconButton, IconName, IconTile, Row, Section, Sheet, T } from '../components';
import { C, F, S } from '../theme';
import { courses, useApp } from '../model';

const features: { icon: IconName; title: string; description: string; action: string; color: string; bg: string }[] = [
  { icon: 'alarm-outline', title: 'Kế hoạch ôn thi theo deadline', description: 'Chia mục tiêu lớn thành những phiên học vừa sức, bắt đầu từ bài cần ưu tiên.', action: 'Tạo lộ trình', color: C.primary, bg: C.soft },
  { icon: 'calendar-outline', title: 'Lịch học theo thời gian rảnh', description: 'Tìm một khoảng trống giữa những ca học để tập trung mà vẫn có thời gian nghỉ.', action: 'Tìm lịch trống', color: C.primary, bg: C.soft },
  { icon: 'document-text-outline', title: 'Tóm tắt PDF & giáo trình', description: 'Nắm ý chính, công thức và những nội dung cần đọc lại, kèm tham chiếu nguồn.', action: 'Xem bản mẫu', color: C.red, bg: C.redSoft },
  { icon: 'help-circle-outline', title: 'Tạo câu hỏi trắc nghiệm', description: 'Tự kiểm tra kiến thức với câu hỏi ngắn và lời giải thích cho từng lựa chọn.', action: 'Luyện thử', color: C.green, bg: C.greenSoft },
  { icon: 'analytics-outline', title: 'Đánh giá & điều chỉnh kế hoạch', description: 'Nhìn lại tiến độ và dành thêm thời gian cho những phần bạn cần cải thiện.', action: 'Xem đề xuất', color: C.primary, bg: C.soft },
];
export default function Assistant() {
  const { tasks, classes, setStudyPlan, studyPlan, setToast, setTab } = useApp();
  const [feature, setFeature] = useState<number | null>(null); const [prompt, setPrompt] = useState(''); const [sent, setSent] = useState(''); const [answer, setAnswer] = useState<number | null>(null);
  const pending = tasks.filter(t => t.status !== 'Hoàn thành').sort((a,b) => a.deadline.localeCompare(b.deadline));
  const firstTask = pending[0];
  const dayClasses = classes.filter(c => c.weekday === new Date().getDay());
  const slots = ['18:00', '19:00', '20:00', '21:00', '17:00', '16:00', '15:00', '14:00', '11:00', '10:00', '09:00', '08:00'].filter(start => {
    const end = `${start.slice(0,2)}:45`;
    return !dayClasses.some(c => start < c.end && end > c.start);
  }).slice(0, 2).sort();
  const proposed = slots.map((s,i) => `${s} – ${s.slice(0,2)}:45 · ${i === 0 ? firstTask?.title ?? 'Ôn lại kiến thức hôm nay' : `Ôn tập ${courses[0]}`}`);
  const send = () => { if (!prompt.trim()) return; setSent(prompt.trim()); setPrompt(''); setFeature(0); };
  return <>
    <LinearGradient colors={['#7862EA', '#5341CD', '#7865DE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 23, borderRadius: 32, gap: 20, boxShadow: '0px 12px 24px rgba(108,92,231,0.18)' }}>
      <Badge label="Trợ lý học tập • Bản xem trước" bg="#FFFFFF26" color="#fff" icon="sparkles" />
      <Row style={{ gap: 12 }}><View style={S.grow}><T style={{ color: '#fff', fontFamily: F.extra, fontSize: 24, lineHeight: 34, letterSpacing: -0.8 }}>Hôm nay, mình cùng học gì nhé?</T><T style={{ color: '#E9E2FF', fontSize: 12, lineHeight: 21, marginTop: 8 }}>Một kế hoạch vừa sức. Một chút tập trung. Thêm nhiều tiến bộ mỗi ngày.</T></View><Image source={require('../../assets/mentor.png')} style={{ width: 84, height: 95, borderRadius: 23 }} /></Row>
      <Row style={{ borderTopWidth: 1, borderTopColor: '#FFFFFF28', paddingTop: 16 }}>{[{ value: '5', label: 'Công cụ học tập' }, { value: 'Của bạn', label: 'Quyền quyết định' }, { value: 'Từng bước', label: 'Cách tiến bộ' }].map(s => <View key={s.label} style={{ flex: 1, alignItems: 'center', gap: 3 }}><T style={{ color: '#fff', fontFamily: F.bold, fontSize: 14 }}>{s.value}</T><T style={{ color: '#E9E2FF', fontSize: 9 }}>{s.label}</T></View>)}</Row>
    </LinearGradient>
    <Card style={{ gap: 12 }}><Row style={{ gap: 12 }}><IconTile name="bulb-outline" /><View style={S.grow}><T style={{ color: C.primary, fontSize: 10, fontFamily: F.bold, letterSpacing: 1 }}>GỢI Ý HÔM NAY</T><T style={{ fontFamily: F.bold, fontSize: 14, marginTop: 4 }}>{pending.length ? 'Bắt đầu từ một bài tập sắp đến hạn' : 'Dành một phiên để ôn lại bài'}</T><T style={{ color: C.muted, fontSize: 12, lineHeight: 20, marginTop: 4 }}>{firstTask?.title ?? 'Hôm nay bạn đã làm rất tốt. Một phiên ngắn sẽ giúp ghi nhớ lâu hơn.'}</T></View></Row><Row><Button label="Xem kế hoạch" icon="sparkles-outline" onPress={() => { setSent(''); setFeature(0); }} style={S.grow} /><Button label="Tự tập trung" secondary onPress={() => setTab('focus')} /></Row></Card>
    <Section title="5 công cụ học tập" icon="sparkles-outline" />
    {features.map((f, i) => <Pressable key={f.title} accessibilityRole="button" accessibilityLabel={f.action} onPress={() => { setSent(''); setAnswer(null); setFeature(i); }}><Card style={{ gap: 13 }}><Row style={{ alignItems: 'flex-start', gap: 13 }}><IconTile name={f.icon} color={f.color} bg={f.bg} /><View style={[S.grow, { gap: 5 }]}><T style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 23 }}>{f.title}</T><T style={{ color: C.muted, fontSize: 12, lineHeight: 20 }}>{f.description}</T></View></Row><Row between style={{ marginLeft: 57 }}><T style={{ color: C.muted, fontSize: 10 }}>Khám phá bản mẫu</T><Row><T style={{ color: C.primary, fontFamily: F.semi, fontSize: 12 }}>{f.action}</T><Icon name="chevron-forward" size={14} /></Row></Row></Card></Pressable>)}
    <Section title="Bắt đầu bằng một câu hỏi" />
    <View style={{ gap: 8 }}>{['Lập kế hoạch ôn thi tuần này', 'Giúp mình ưu tiên bài tập'].map(q => <Pressable key={q} onPress={() => { setSent(q); setFeature(0); }} accessibilityRole="button" style={{ backgroundColor: '#fff', minHeight: 44, borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="chatbubble-outline" size={16} /><T style={{ fontSize: 12 }}>{q}</T></Pressable>)}</View>
    <Card style={{ padding: 10 }}><Row><TextInput value={prompt} onChangeText={setPrompt} onSubmitEditing={send} returnKeyType="send" accessibilityLabel="Câu hỏi cho trợ lý" placeholder="Bạn đang muốn học gì?" placeholderTextColor={C.muted} style={{ flex: 1, minWidth: 0, padding: 9, fontFamily: F.regular, fontSize: 13, color: C.ink }} /><IconButton name="send" label="Gửi câu hỏi" bg={C.primary} color="#fff" onPress={send} /></Row></Card>
    <T style={{ textAlign: 'center', fontSize: 11, lineHeight: 18, color: C.muted }}>Đang dùng đề xuất mẫu để bạn trải nghiệm giao diện.{"\n"}Bạn luôn xem và chọn trước khi thêm vào kế hoạch.</T>
    {feature !== null && <Sheet title={features[feature]!.title} onClose={() => setFeature(null)}>
      <Badge label="Nội dung mẫu • Chưa kết nối AI" icon="information-circle-outline" />
      {!!sent && <Card style={{ backgroundColor: C.canvas }}><T style={S.small}>Câu hỏi của bạn</T><T style={{ fontFamily: F.semi }}>{sent}</T></Card>}
      {(feature === 0 || feature === 1 || feature === 4) && <>
        <T>Thử dành hai khoảng học ngắn hôm nay, ưu tiên bài sắp đến hạn và ôn lại một chủ đề khó.</T>
        <T style={S.small}>Các khoảng dưới đây đã đối chiếu với ca học mẫu. Kế hoạch tự học được tách riêng với hạn nộp bài.</T>
        {proposed.map((p, i) => <Card key={p} style={{ backgroundColor: C.canvas }}><Row><IconTile name={i ? 'book-outline' : 'clipboard-outline'} size={36} /><T style={[S.grow, { fontSize: 13 }]}>{p}</T></Row></Card>)}
        {proposed.length === 0 && <T>Chưa tìm được khoảng trống 45 phút trong lịch mẫu hôm nay.</T>}
        <Button label={studyPlan.join() === proposed.join() && proposed.length > 0 ? 'Đã thêm kế hoạch này' : 'Chấp nhận kế hoạch mẫu'} icon="checkmark" disabled={!proposed.length || studyPlan.join() === proposed.join()} onPress={() => { setStudyPlan(proposed); setToast('Đã thêm kế hoạch tự học vào Trang chủ'); setFeature(null); }} />
        <Button label="Để mình cân nhắc thêm" secondary onPress={() => setFeature(null)} />
      </>}
      {feature === 2 && <><T style={{ fontFamily: F.bold }}>Tài liệu mẫu: Cấu trúc dữ liệu – Cây nhị phân</T><T style={S.small}>Đoạn nguồn minh họa: “Cây tìm kiếm nhị phân lưu khóa nhỏ hơn ở cây con trái, khóa lớn hơn ở cây con phải. Duyệt giữa theo thứ tự trái, gốc, phải.”</T><Card style={{ backgroundColor: C.canvas, gap: 12 }}><T>• Mỗi nút chia dữ liệu thành hai nhánh theo giá trị khóa. [1]</T><T>• Duyệt giữa cho thứ tự khóa tăng dần khi khóa là duy nhất. [1]</T><T style={{ fontSize: 11, color: C.primary }}>[1] Đoạn nguồn minh họa bên trên, câu 1–2.</T></Card><T style={S.small}>Tải PDF thật, trích trang và xử lý tài liệu sẽ được làm sau khi nối backend. Ở đợt này bạn đang xem bố cục kết quả mẫu.</T></>}
      {feature === 3 && <><T style={{ fontFamily: F.bold, fontSize: 17 }}>Duyệt giữa cây tìm kiếm nhị phân đi theo thứ tự nào?</T>{['Gốc → Trái → Phải', 'Trái → Gốc → Phải', 'Trái → Phải → Gốc'].map((a, i) => <Button key={a} label={a} secondary={answer !== i} onPress={() => setAnswer(i)} />)}{answer !== null && <Card style={{ backgroundColor: answer === 1 ? C.greenSoft : C.amberSoft, gap: 8 }}><T style={{ fontFamily: F.bold }}>{answer === 1 ? 'Chính xác!' : 'Thử ghi nhớ theo vị trí gốc nhé.'}</T><T>Duyệt giữa: cây con trái, nút gốc, rồi cây con phải. Với cây tìm kiếm có khóa duy nhất, kết quả tăng dần.</T><T style={S.small}>Nguồn: đoạn tài liệu minh họa trong mục Tóm tắt.</T></Card>}</>}
    </Sheet>}
  </>;
}
