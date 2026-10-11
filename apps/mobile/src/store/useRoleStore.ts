import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../storage';

export type UserRole = 'customer' | 'owner' | null;

interface RoleState {
  role: UserRole;
  deviceCustomerId: string;
  customerName: string;
  customerMobile: string;
  activeTokenId: string | null;
  activeBusinessId: string | null;
  ownerBusinessId: string | null;
  setRole: (role: UserRole) => void;
  setCustomerProfile: (name: string, mobile: string) => void;
  setActiveToken: (tokenId: string | null, businessId: string | null) => void;
  setOwnerBusinessId: (bizId: string | null) => void;
  clearSession: () => void;
}

const generateDeviceId = () => {
  return 'device_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
};

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: null,
      deviceCustomerId: generateDeviceId(),
      customerName: '',
      customerMobile: '',
      activeTokenId: null,
      activeBusinessId: null,
      ownerBusinessId: null,

      setRole: (role: UserRole) => set({ role }),

      setCustomerProfile: (name: string, mobile: string) =>
        set({ customerName: name, customerMobile: mobile }),

      setActiveToken: (tokenId: string | null, businessId: string | null) =>
        set({ activeTokenId: tokenId, activeBusinessId: businessId }),

      setOwnerBusinessId: (bizId: string | null) =>
        set({ ownerBusinessId: bizId }),

      clearSession: () =>
        set({
          role: null,
          activeTokenId: null,
          activeBusinessId: null,
          ownerBusinessId: null,
        }),
    }),
    {
      name: 'queueless_role_store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
