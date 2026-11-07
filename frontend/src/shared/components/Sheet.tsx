import { ActionScope, InteractionBlock, useActionState } from '../feedback/ActionScope';
import { ActionStatus } from './ActionStatus';
import { NoticeToast } from './NoticeToast';
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S } from '../theme';
import { RememberedScrollView, useBackAction, useNavigationScope } from '../../navigation/Navigation';
import { DateTimePanel, DateTimeProvider, useDateTimePicker } from './DateTimePicker';
import { IconButton } from './IconButton';
import { Row } from './Row';
import { T } from './Typography';
import { UnsavedChanges } from '../forms/UnsavedChanges';

type SheetProps = {
    title: string;
    children: ReactNode;
    onClose: () => void;
    onBack?: () => void;
    scrollKey?: string;
    dirty?: boolean;
};

const SheetFlowContext = createContext<RefObject<(() => void) | null> | null>(null);

// Keep the native modal mounted while the current sheet in this flow changes.
export function SheetFlow({ children }: { children: ReactNode }) {
    const parent = useContext(SheetFlowContext);
    const scope = useNavigationScope();
    const back = useRef<(() => void) | null>(null);
    if (parent) return <>{children}</>;
    return (
        <Modal visible={scope.active} transparent animationType="slide" onRequestClose={() => back.current?.()}>
            <SheetFlowContext.Provider value={back}>{children}</SheetFlowContext.Provider>
        </Modal>
    );
}

export function Sheet(props: SheetProps) {
    return (
        <ActionScope><DateTimeProvider>
            <SheetContent {...props} />
        </DateTimeProvider></ActionScope>
    );
}

function SheetContent({ title, children, onClose, onBack, scrollKey, dirty = false }: SheetProps) {
    const inset = useSafeAreaInsets();
    const picker = useDateTimePicker(), scope = useNavigationScope();
    const flow = useContext(SheetFlowContext);
    const action = useActionState();
    const [confirming, setConfirming] = useState(false);
    const pendingExit = useRef<(() => void) | null>(null);
    const keepEditing = () => { pendingExit.current = null; setConfirming(false); };
    const requestExit = (exit: () => void) => {
        // Stop a delayed prototype save before showing a discard decision.
        action?.cancel();
        if (confirming) { keepEditing(); return; }
        if (picker.active) { picker.cancel(); return; }
        if (!dirty) { exit(); return; }
        Keyboard.dismiss(); pendingExit.current = exit; setConfirming(true);
    };
    const back = () => requestExit(onBack ?? onClose);
    const dismiss = () => requestExit(scope.closeFlow ?? onClose);
    const discard = () => { const exit = pendingExit.current; keepEditing(); action?.cancel(); exit?.(); };
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined' || !scope.active || !dirty) return;
        const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', leave);
        return () => window.removeEventListener('beforeunload', leave);
    }, [scope.active, dirty]);
    useBackAction(true, back, picker.active ? 1000 + scope.depth : undefined);
    useLayoutEffect(() => {
        if (!flow || !scope.active) return;
        flow.current = back;
        return () => { if (flow.current === back) flow.current = null; };
    });
    const content = (
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
                            {confirming ? 'Thay đổi chưa lưu' : picker.active ? `Chọn ${picker.active.label.toLocaleLowerCase()}` : title}
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
                        active={!picker.active && !confirming}
                        style={picker.active || confirming ? { display: 'none' } : undefined}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ padding: 22, paddingTop: 4, gap: 16 }}
                    >
                        <InteractionBlock>{children}</InteractionBlock>
                    </RememberedScrollView>
                    {picker.active && !confirming && (
                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingTop: 4 }}>
                            <DateTimePanel />
                        </ScrollView>
                    )}
                    {confirming ? <UnsavedChanges onContinue={keepEditing} onDiscard={discard} /> : <ActionStatus />}
                </View>
                <NoticeToast modal bottom={Math.max(22, inset.bottom)} />
            </KeyboardAvoidingView>
    );
    return flow
        ? <SheetFlowContext.Provider value={null}>{content}</SheetFlowContext.Provider>
        : <Modal visible={scope.active} transparent animationType="slide" onRequestClose={back}>{content}</Modal>;
}
