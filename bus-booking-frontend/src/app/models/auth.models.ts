// ─── Auth Models ──────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: string; // 'Customer' | 'Operator' | 'Admin'
  fullName: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  fullName: string;
}

export interface CurrentUser {
  userId: string;
  username: string;
  email: string;
  role: 'Admin' | 'Operator' | 'Customer';
  fullName: string;
  token: string;
  expiresAtUtc: string;
  companyName?: string;
}