import { create } from 'zustand';
import { UserState } from '../types/types';

const useUserStore = create<UserState>((set) => ({
    role: localStorage.getItem('userRole'),
    previousLastLogin: null,
    setRole: (role: string | null) => {
        if (role === null) {
            localStorage.removeItem('userRole'); // Remove the item if role is null
        } else {
            localStorage.setItem('userRole', role); // Persist the role
        }
        set({ role });
    },
    setPreviousLastLogin: (lastLogin: Date | null) => {
        set({ previousLastLogin: lastLogin });
    }
}));

export { useUserStore };
