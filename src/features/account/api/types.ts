export type AccountProfile = { id: string; email: string; fullName: string; school: string; major: string; timeZone: string };
export type RegisterInput = { email: string; fullName: string; password: string; confirmPassword: string; school: string; major: string };
export type LoginInput = { email: string; password: string };
export type LoginResult = { accessToken: string; tokenType: 'Bearer'; expiresIn: number; user: AccountProfile;
  refreshToken?: string; refreshExpiresAt: string; sessionExpiresAt: string };
