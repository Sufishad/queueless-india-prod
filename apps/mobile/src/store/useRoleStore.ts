import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../storage';

export type UserRole = 'customer' | 'owner' | null;

export interface ActiveTokenSummary {
  tokenId: string;
  businessId: string;
  tokenNumber: number;
  businessName: string;
  serviceName: string;
  peopleAhead: number;
  currentToken: number;
  status: string;
  customerMobile: string;
  customerName: string;
  upiId?: string;
  price?: number;
  joinedAt?: string;
}

export interface UserLocation {
  city: string;
  pincode: string;
  area: string;
  lat: number;
  lng: number;
}

interface RoleState {
  role: UserRole;
  deviceCustomerId: string;
  customerName: string;
  customerMobile: string;
  activeTokenId: string | null;
  activeBusinessId: string | null;
  activeTokenSummary: ActiveTokenSummary | null;
  savedBusinessIds: string[];
  userLocation: UserLocation;
  ownerBusinessId: string | null;
  setRole: (role: UserRole) => void;
  setCustomerProfile: (name: string, mobile: string) => void;
  setActiveToken: (tokenId: string | null, businessId: string | null) => void;
  setActiveTokenSummary: (summary: ActiveTokenSummary | null) => void;
  toggleSaveBusiness: (bizId: string) => void;
  isSavedBusiness: (bizId: string) => boolean;
  setUserLocation: (loc: Partial<UserLocation>) => void;
  setOwnerBusinessId: (bizId: string | null) => void;
  clearSession: () => void;
}

const generateDeviceId = () => {
  return 'device_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
};

export const useRoleStore = create<RoleState>()(
  persist(
    (set, get) => ({
      role: null,
      deviceCustomerId: generateDeviceId(),
      customerName: '',
      customerMobile: '',
      activeTokenId: null,
      activeBusinessId: null,
      activeTokenSummary: null,
      savedBusinessIds: [],
      userLocation: {
        city: 'Bengaluru',
        area: 'Indiranagar',
        pincode: '560038',
        lat: 12.9716,
        lng: 77.6412,
      },
      ownerBusinessId: null,

      setRole: (role: UserRole) => set({ role }),

      setCustomerProfile: (name: string, mobile: string) =>
        set({ customerName: name, customerMobile: mobile }),

      setActiveToken: (tokenId: string | null, businessId: string | null) =>
        set({ activeTokenId: tokenId, activeBusinessId: businessId }),

      setActiveTokenSummary: (summary: ActiveTokenSummary | null) =>
        set({
          activeTokenSummary: summary,
          activeTokenId: summary ? summary.tokenId : null,
          activeBusinessId: summary ? summary.businessId : null,
        }),

      toggleSaveBusiness: (bizId: string) => {
        const current = get().savedBusinessIds;
        if (current.includes(bizId)) {
          set({ savedBusinessIds: current.filter((id) => id !== bizId) });
        } else {
          set({ savedBusinessIds: [...current, bizId] });
        }
      },

      isSavedBusiness: (bizId: string) => {
        return get().savedBusinessIds.includes(bizId);
      },

      setUserLocation: (loc: Partial<UserLocation>) =>
        set((state) => ({
          userLocation: { ...state.userLocation, ...loc },
        })),

      setOwnerBusinessId: (bizId: string | null) =>
        set({ ownerBusinessId: bizId }),

      clearSession: () =>
        set({
          role: null,
          activeTokenId: null,
          activeBusinessId: null,
          activeTokenSummary: null,
          ownerBusinessId: null,
        }),
    }),
    {
      name: 'queueless_role_store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
