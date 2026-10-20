import React from 'react';
import { F, S } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { IconTile } from './IconTile';
import { T } from './Typography';

export function Empty({ title, message, onAdd }: {
    title: string;
    message: string;
    onAdd?: () => void;
}) { return <Card style={{ alignItems: 'center', gap: 10, padding: 28 }}><IconTile name="leaf-outline" size={54}/><T style={{ fontFamily: F.bold, textAlign: 'center' }}>{title}</T><T style={[S.small, { textAlign: 'center' }]}>{message}</T>{onAdd && <Button label="Thêm mới" icon="add" onPress={onAdd}/>}</Card>; }
