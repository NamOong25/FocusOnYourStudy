import React from 'react';
import { StateView } from './StateView';

export function Empty({ title, message, onAdd, actionLabel = 'Thêm mới' }: { title: string; message: string; onAdd?: () => void; actionLabel?: string }) {
    return <StateView title={title} message={message} actionLabel={actionLabel} onAction={onAdd} />;
}
