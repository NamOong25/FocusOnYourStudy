import React from 'react';
import { Image } from 'react-native';

export function BrandLogo() {
  return <Image source={require('../../../assets/logo.png')} accessible={false}
    style={{ width: 39, height: 39, borderRadius: 13 }} />;
}
