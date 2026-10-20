import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S } from '../theme';
import { RememberedScrollView, useBackAction, useNavigationScope } from '../../navigation/Navigation';
import { DateTimePanel, DateTimeProvider, useDateTimePicker } from './DateTimePicker';
import { IconButton } from './IconButton';
import { Row } from './Row';
import { T } from './Typography';

type SheetProps = {
    title: string;
    children: ReactNode;
    onClose: () => void;
    onBack?: () => void;
    scrollKey?: string;
};

export function Sheet(props: SheetProps) {
    return (
        <DateTimeProvider>
            <SheetContent {...props} />
        </DateTimeProvider>
    );
}

function SheetContent({ title, children, onClose, onBack, scrollKey }: SheetProps) {
    const inset = useSafeAreaInsets();
    const picker = useDateTimePicker(), scope = useNavigationScope();
    const back = picker.active ? picker.cancel : onBack ?? onClose;
    const dismiss = picker.active ? picker.cancel : scope.closeFlow ?? onClose;
    useBackAction(true, back, picker.active ? 1000 + scope.depth : undefined);
    return (
        <Modal visible={scope.active} transparent animationType="slide" onRequestClose={back}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{
                    flex: 1,
                    display: scope.active ? 'flex' : 'none',
                    backgroundColor: '#16113266',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                }}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Đóng hộp thoại"
                    onPress={dismiss}
                    style={{ position: 'absolute', width: '100%', height: '100%' }}
                />
                <View style={{
                    backgroundColor: '#fff',
                    width: '100%',
                    maxWidth: 520,
                    maxHeight: '90%',
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 30,
                    paddingBottom: Math.max(22, inset.bottom),
                }}>
                    <View style={{ alignSelf: 'center', backgroundColor: C.line, width: 36, height: 4, borderRadius: 4, marginTop: 12 }} />
                    <Row between style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 6 }}>
                        <IconButton name="arrow-back" label="Quay lại" onPress={back} bg="transparent" />
                        <T style={[S.title, S.grow]}>
                            {picker.active ? `Chọn ${picker.active.label.toLocaleLowerCase()}` : title}
                        </T>
                        <IconButton
                            name="close"
                            label={picker.active ? 'Hủy chọn ngày giờ' : 'Đóng'}
                            onPress={dismiss}
                            bg={C.canvas}
                        />
                    </Row>
                    <RememberedScrollView
                        key={scrollKey}
                        memoryKey={`${title}:${scrollKey ?? ''}`}
                        active={!picker.active}
                        style={picker.active ? { display: 'none' } : undefined}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ padding: 22, paddingTop: 4, gap: 16 }}
                    >
                        {children}
                    </RememberedScrollView>
                    {picker.active && (
                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingTop: 4 }}>
                            <DateTimePanel />
                        </ScrollView>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
