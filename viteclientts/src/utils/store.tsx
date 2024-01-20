import { create } from 'zustand';
import { UserState } from '../types/types';

export const useUserStore = create<UserState>(set => ({
    role: null,
    setRole: (role) => set({ role })
}))