import React from 'react';
import { S } from '../theme';
import { Icon, type IconName } from './Icon';
import { Row } from './Row';
import { Link } from './Link';
import { T } from './Typography';

export function Section({ title, icon, action, onAction }: {
    title: string;
    icon?: IconName;
    action?: string;
    onAction?: () => void;
}) { return <Row between style={{ marginTop: 7, marginBottom: -4 }}>{icon && <Icon name={icon}/>}<T style={[S.title, S.grow]}>{title}</T>{action && onAction && <Link label={action} onPress={onAction}/>}</Row>; }
