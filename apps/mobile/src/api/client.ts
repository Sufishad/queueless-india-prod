import { Platform } from 'react-native';

// Use local machine IP/localhost depending on platform
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_HOST;

export interface BusinessItem {
  id: string;
  name: string;
  category: string;
  address: string;
  location: { type: string; coordinates: [number, number] };
  upiId?: string;
  status: string;
  queueStatus: string;
  openingTime?: string;
  closingTime?: string;
  verified: boolean;
  currentToken: number;
  lastToken: number;
  waitingCount: number;
  estimatedWaitMin: number;
  distanceKm?: number | null;
  servicesCount: number;
}

export interface ServiceItem {
  id: string;
  businessId?: string;
  name: string;
  price: number;
  estimatedDuration?: number;
  duration_min?: number;
  active?: boolean;
  is_active?: boolean;
  description?: string;
}

export interface BusinessDetail {
  id: string;
  name: string;
  category: string;
  address: string;
  location: { type: string; coordinates: [number, number] };
  upiId?: string;
  status: string;
  queueStatus: string;
  openingTime?: string;
  closingTime?: string;
  verified: boolean;
  services: ServiceItem[];
  queueState: {
    businessId: string;
    currentToken: number;
    lastToken: number;
    waitingCount: number;
    status: string;
  };
}

export interface JoinQueuePayload {
  customerName: string;
  customerMobile: string;
  serviceId: string;
  customerId: string;
}

export interface JoinQueueResult {
  entryId: string;
  tokenNumber: number;
  businessId: string;
  serviceId: string;
  customerName: string;
  customerMobile: string;
  status: string;
  peopleAhead: number;
  estimatedWaitMin: number;
  createdAt: string;
  message: string;
}

export interface LiveTokenData {
  id: string;
  businessId: string;
  businessName: string;
  businessAddress: string;
  businessUpiId?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  tokenNumber: number;
  currentToken: number;
  status: string;
  peopleAhead: number;
  estimatedWaitMin: number;
  customerName: string;
  customerMobile: string;
  createdAt: string;
}

export async function fetchBusinesses(params?: {
  q?: string;
  category?: string;
  lat?: number;
  lng?: number;
}): Promise<BusinessItem[]> {
  const query = new URLSearchParams();
  if (params?.q) query.append('q', params.q);
  if (params?.category && params.category !== 'all') query.append('category', params.category);
  if (params?.lat !== undefined) query.append('lat', params.lat.toString());
  if (params?.lng !== undefined) query.append('lng', params.lng.toString());

  const url = `${API_BASE_URL}/api/v1/businesses?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch businesses: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchBusinessDetail(businessId: string): Promise<BusinessDetail> {
  const url = `${API_BASE_URL}/api/v1/businesses/${businessId}/detail`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch business details: ${res.statusText}`);
  }
  return res.json();
}

export async function joinQueue(
  businessId: string,
  payload: JoinQueuePayload
): Promise<JoinQueueResult> {
  const url = `${API_BASE_URL}/api/v1/businesses/${businessId}/queue/join`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Customer-Session-ID': payload.customerId,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || errorData.detail || 'Failed to join queue');
  }
  return res.json();
}

export async function cancelToken(
  businessId: string,
  entryId: string,
  sessionId?: string
): Promise<{ status: string; message: string }> {
  const url = `${API_BASE_URL}/api/v1/businesses/${businessId}/queue/cancel`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'X-Customer-Session-ID': sessionId } : {}),
    },
    body: JSON.stringify({
      entryId,
      customerSessionId: sessionId,
      cancellationReason: 'Cancelled by customer',
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || errorData.detail || 'Failed to cancel token');
  }
  return res.json();
}

export async function fetchLiveToken(entryId: string): Promise<LiveTokenData> {
  const url = `${API_BASE_URL}/api/v1/queue/token/${entryId}/live`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch live token: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchUserTokens(params?: {
  mobile?: string;
  sessionId?: string;
  status?: string;
}): Promise<LiveTokenData[]> {
  const query = new URLSearchParams();
  if (params?.mobile) query.append('mobile', params.mobile);
  if (params?.sessionId) query.append('session_id', params.sessionId);
  if (params?.status) query.append('status', params.status);

  const url = `${API_BASE_URL}/api/v1/queue/tokens/user/list?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch user tokens: ${res.statusText}`);
  }
  return res.json();
}

export async function seedDemoData(): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/businesses/seed`;
  const res = await fetch(url, { method: 'POST' });
  return res.json();
}

export function getWebSocketUrl(businessId: string): string {
  const wsHost = API_BASE_URL.replace(/^http/, 'ws');
  return `${wsHost}/ws/queue/${businessId}`;
}

// ==========================================
// SPRINT 4: BUSINESS OWNER CONSOLE TYPES & APIS
// ==========================================

export interface OwnerUser {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessId?: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  owner: OwnerUser;
}

export interface OnboardingPayload {
  shop_name: string;
  category: string;
  description?: string;
  address: string;
  city: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  upi_id?: string;
  opens_at?: string;
  closes_at?: string;
  services?: Array<{ name: string; price: number; duration_min: number }>;
}

export interface OwnerDashboardData {
  businessId: string;
  businessName: string;
  queueStatus: string;
  currentToken: number;
  lastToken: number;
  waitingCount: number;
  nowServing: {
    entryId: string;
    tokenNumber: number;
    customerName: string;
    maskedMobile: string;
    serviceName: string;
    servicePrice: number;
    status: string;
    paymentStatus: 'PAID' | 'UNPAID';
    paymentMode: 'CASH' | 'UPI';
    joinedAt: string;
  } | null;
  stats: {
    waitingCount: number;
    servedToday: number;
    skippedToday: number;
    totalRevenueToday: number;
  };
}

export interface OwnerQueueEntry {
  entryId: string;
  tokenNumber: number;
  customerName: string;
  maskedMobile: string;
  customerMobile: string;
  serviceId?: string;
  serviceName: string;
  servicePrice: number;
  status: string;
  paymentStatus: 'PAID' | 'UNPAID';
  paymentMode: 'CASH' | 'UPI';
  waitTimeMin: number;
  createdAt: string;
}

export interface OwnerAnalyticsData {
  businessId: string;
  totalServed: number;
  totalSkipped: number;
  averageWaitTimeMin: number;
  totalRevenue: number;
  hourlyDistribution: Record<string, number>;
}

export async function ownerSignup(payload: {
  name: string;
  mobile: string;
  password: string;
  email?: string;
}): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/api/v1/auth/signup`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Signup failed');
  }
  return res.json();
}

export async function ownerLogin(payload: {
  mobile: string;
  password: string;
}): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/api/v1/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Invalid mobile or password');
  }
  return res.json();
}

export async function ownerGetMe(token: string): Promise<OwnerUser> {
  const url = `${API_BASE_URL}/api/v1/auth/me`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to authenticate owner session');
  }
  return res.json();
}

export async function ownerOnboardBusiness(
  token: string,
  payload: OnboardingPayload
): Promise<{ businessId: string; businessName: string; message: string }> {
  const url = `${API_BASE_URL}/api/v1/owner/onboard`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Onboarding failed');
  }
  return res.json();
}

export async function fetchOwnerDashboard(
  token: string,
  businessId: string
): Promise<OwnerDashboardData> {
  const url = `${API_BASE_URL}/api/v1/owner/business/${businessId}/dashboard`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch owner dashboard: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchOwnerLiveQueue(
  token: string,
  businessId: string
): Promise<OwnerQueueEntry[]> {
  const url = `${API_BASE_URL}/api/v1/owner/business/${businessId}/queue`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch owner live queue: ${res.statusText}`);
  }
  return res.json();
}

export async function ownerCallNext(businessId: string): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/businesses/${businessId}/queue/call-next`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to call next token');
  }
  return res.json();
}

export async function ownerCompleteToken(
  businessId: string,
  entryId: string
): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/businesses/${businessId}/queue/token/${entryId}/complete`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to complete token');
  }
  return res.json();
}

export async function ownerCancelToken(
  businessId: string,
  entryId: string,
  reason: string = 'Customer absent'
): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/businesses/${businessId}/queue/cancel`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entry_id: entryId,
      cancelled_by: 'owner',
      reason,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to cancel token');
  }
  return res.json();
}

export async function ownerUpdatePayment(
  token: string,
  entryId: string,
  paymentStatus: 'PAID' | 'UNPAID',
  paymentMode: 'CASH' | 'UPI' = 'CASH'
): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/owner/queue/${entryId}/payment`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      payment_status: paymentStatus,
      payment_mode: paymentMode,
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to update payment status');
  }
  return res.json();
}

export async function ownerResetDailyQueue(
  token: string,
  businessId: string
): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/owner/business/${businessId}/queue/reset`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to reset daily queue');
  }
  return res.json();
}

export async function ownerToggleQueuePause(
  token: string,
  businessId: string
): Promise<{ businessId: string; queueStatus: string }> {
  const url = `${API_BASE_URL}/api/v1/owner/business/${businessId}/queue/toggle-pause`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to toggle queue pause');
  }
  return res.json();
}

export async function ownerToggleBusinessStatus(
  token: string,
  businessId: string
): Promise<{ businessId: string; businessStatus: string }> {
  const url = `${API_BASE_URL}/api/v1/owner/business/${businessId}/toggle-status`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to toggle business status');
  }
  return res.json();
}

export async function createWalkInToken(
  businessId: string,
  payload: {
    customerName: string;
    customerMobile?: string;
    serviceId?: string;
  }
): Promise<any> {
  const url = `${API_BASE_URL}/api/v1/businesses/${businessId}/queue/walk-in`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: payload.customerName,
      customer_mobile: payload.customerMobile || undefined,
      service_id: payload.serviceId || undefined,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create walk-in token');
  }
  return res.json();
}

export async function fetchOwnerServices(businessId: string): Promise<ServiceItem[]> {
  const url = `${API_BASE_URL}/api/v1/owner/business/${businessId}/services`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch services');
  }
  return res.json();
}

export async function createOwnerService(
  token: string,
  businessId: string,
  payload: { name: string; price: number; duration_min: number; description?: string }
): Promise<ServiceItem> {
  const url = `${API_BASE_URL}/api/v1/owner/business/${businessId}/services`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to create service');
  }
  return res.json();
}

export async function updateOwnerService(
  token: string,
  businessId: string,
  serviceId: string,
  payload: Partial<{ name: string; price: number; duration_min: number; is_active: boolean }>
): Promise<ServiceItem> {
  const url = `${API_BASE_URL}/api/v1/owner/business/${businessId}/services/${serviceId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to update service');
  }
  return res.json();
}

export async function fetchOwnerAnalytics(
  token: string,
  businessId: string
): Promise<OwnerAnalyticsData> {
  const url = `${API_BASE_URL}/api/v1/owner/business/${businessId}/analytics`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch owner analytics');
  }
  return res.json();
}
