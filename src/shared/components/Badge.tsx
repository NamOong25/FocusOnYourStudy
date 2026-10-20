import React from 'react';
import { C, F } from '../theme';
import { Icon, type IconName } from './Icon';
import { Row } from './Row';
import { T } from './Typography';

export function Badge({ label, color = C.primary, bg = C.soft, icon }: {
    label: string;
    color?: string;
    bg?: string;
    icon?: IconName;
}) { return <Row style={{ alignSelf: 'flex-start', borderRadius: 99, backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, gap: 4 }}>{icon && <Icon name={icon} size={12} color={color}/>}<T style={{ fontFamily: F.semi, fontSize: 10, lineHeight: 16, color }}>{label}</T></Row>; }
