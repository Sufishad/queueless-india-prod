import { create } from 'zustand';
import { appStorage } from '../storage';
import { OwnerUser } from '../api/client';

interface OwnerState {
  ownerToken: string | null;
  owner: OwnerUser | null;
  businessId: string | null;
  isMuted: boolean;
  isLoading: boolean;
  setAuth: (token: string, owner: OwnerUser, businessId?: string) => void;
  setBusinessId: (businessId: string) => void;
  toggleMute: () => void;
  logout: () => void;
  loadOwnerSession: () => Promise<void>;
}

export const useOwnerStore = create<OwnerState>((set, get) => ({
  ownerToken: null,
  owner: null,
  businessId: null,
  isMuted: false,
  isLoading: true,

  setAuth: (token: string, owner: OwnerUser, businessId?: string) => {
    const finalBizId = businessId || owner.businessId || null;
    set({
      ownerToken: token,
      owner,
      businessId: finalBizId,
      isLoading: false,
    });
    appStorage.setItem('owner_token', token);
    appStorage.setItem('owner_data', JSON.stringify(owner));
    if (finalBizId) {
      appStorage.setItem('owner_business_id', finalBizId);
    }
  },

  setBusinessId: (businessId: string) => {
    set({ businessId });
    appStorage.setItem('owner_business_id', businessId);
  },

  toggleMute: () => {
    const newMuted = !get().isMuted;
    set({ isMuted: newMuted });
    appStorage.setItem('owner_is_muted', newMuted ? 'true' : 'false');
  },

  logout: () => {
    set({
      ownerToken: null,
      owner: null,
      businessId: null,
      isLoading: false,
    });
    appStorage.removeItem('owner_token');
    appStorage.removeItem('owner_data');
    appStorage.removeItem('owner_business_id');
  },

  loadOwnerSession: async () => {
    try {
      const token = await appStorage.getItem('owner_token');
      const ownerJson = await appStorage.getItem('owner_data');
      const bizId = await appStorage.getItem('owner_business_id');
      const mutedStr = await appStorage.getItem('owner_is_muted');

      set({
        ownerToken: typeof token === 'string' ? token : null,
        owner: typeof ownerJson === 'string' ? JSON.parse(ownerJson) : null,
        businessId: typeof bizId === 'string' ? bizId : null,
        isMuted: mutedStr === 'true',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
