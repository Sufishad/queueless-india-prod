// Shared types for the TV Kiosk queue state

export interface CounterInfo {
  id: string;
  name: string;
  operator_name?: string | null;
  current_token?: number | null;
}

export interface QueueEntryLite {
  tokenNumber: number;
  customerName: string;
  serviceName?: string;
}

export interface QueueStateSnapshot {
  businessId: string;
  businessName?: string;
  currentToken: number;
  servingCounter?: CounterInfo | null;
  waiting: QueueEntryLite[];
  waitingCount: number;
  servedToday: number;
  skippedToday: number;
  paused?: boolean;
  shopStatus?: string;
}

export interface KioskCallAnnouncement {
  tokenNumber: number;
  customerName: string;
  counterName: string;
  counterId?: string;
  announcement: string;
  announcement_hi?: string;
}

export type KioskLanguage = 'en' | 'hi' | 'hinglish';

export interface AnnounceStyle {
  chime: () => Promise<void> | void;
  speak: (text: string) => Promise<void> | void;
}
