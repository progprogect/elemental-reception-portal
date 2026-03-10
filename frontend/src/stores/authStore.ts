import { create } from 'zustand';

interface AuthState {
  extension: string | null;
  setExtension: (extension: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  extension: null,
  setExtension: (extension) => set({ extension }),
}));
