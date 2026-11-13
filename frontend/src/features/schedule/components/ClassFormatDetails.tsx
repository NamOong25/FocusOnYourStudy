import React, { useState } from 'react';
import { Badge, Button, Card, T } from '../../../shared/components';
import { C, F } from '../../../shared/theme';
import { meetingPlatforms, type ClassFormat } from '../classFormat';

export default function ClassFormatDetails({ format }: { format: ClassFormat }) {
  const [visible, setVisible] = useState(false);
  const platform = format.meetingPlatform;
  return <>
    {format.lessonType === 'PRACTICE' && <Badge label="Thực hành" />}
    {platform && platform !== 'NONE' && <Card style={{ backgroundColor: C.canvas, gap: 8 }}>
      <T style={{ fontFamily: F.bold }}>Học online · {meetingPlatforms[platform]}</T>
      <T selectable>ID cuộc họp {format.meetingId}</T>
      {platform === 'ZOOM' && !!format.meetingPasscode && <>
        {visible && <T selectable>Mật khẩu {format.meetingPasscode}</T>}
        <Button secondary label={visible ? 'Ẩn mật khẩu Zoom' : 'Hiện mật khẩu Zoom'} onPress={() => setVisible(show => !show)} />
      </>}
    </Card>}
  </>;
}
