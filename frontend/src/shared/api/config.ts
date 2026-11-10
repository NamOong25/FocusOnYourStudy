import { Platform } from 'react-native';

// Expo replaces the literal EXPO_PUBLIC_* reference at bundle time. This is a public URL, never a secret.
const nativeUrl = Platform.OS !== 'web' ? process.env.EXPO_PUBLIC_NATIVE_API_URL?.trim() : undefined;
const configuredUrl = nativeUrl || process.env.EXPO_PUBLIC_API_URL?.trim();
const localHost = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_BASE_URL = (configuredUrl || `http://${localHost}:8080`).replace(/\/$/, '');
export const AUTH_TRANSPORT = Platform.OS === 'web' ? 'cookie' : 'body';
