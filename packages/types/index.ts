// Master Types for QueueLess India (क्यूलेस इंडिया)

export type QueueStatus = "active" | "paused";
export type BusinessStatus = "open" | "closed";
export type BusinessPlan = "free" | "starter" | "pro" | "enterprise";

export type QueueEntryStatus = 
  | "waiting"
  | "serving"
  | "completed"
  | "skipped"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid";

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Business {
  id: string;
  name: string;
  category: string;
  address: string;
  location: GeoPoint;
  upiId?: string;
  status: BusinessStatus;
  queueStatus: QueueStatus;
  plan: BusinessPlan;
  verified: boolean;
  openingTime?: string;
  closingTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  price: number; // in INR (₹)
  estimatedDuration: number; // in minutes
  active: boolean;
}

export interface Queue {
  id: string;
  businessId: string;
  currentToken: number;
  lastToken: number;
  date: string; // YYYY-MM-DD
  status: QueueStatus;
  updatedAt: string;
}

export interface QueueEntry {
  id: string;
  businessId: string;
  customerId?: string;
  customerName: string;
  customerMobile: string; // 10-digit Indian Mobile
  serviceName: string;
  servicePrice: number; // Frozen price snapshot at join time
  counterId?: string;
  tokenNumber: number;
  status: QueueEntryStatus;
  paymentStatus: PaymentStatus;
  estimatedWaitMin?: number;
  peopleAhead?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Counter {
  id: string;
  businessId: string;
  name: string;
  currentToken: number;
  active: boolean;
}

export interface QueueLiveState {
  businessId: string;
  currentToken: number;
  lastToken: number;
  waitingCount: number;
  nowServing?: QueueEntry | null;
  status: QueueStatus;
}
