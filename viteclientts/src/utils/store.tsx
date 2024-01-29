import { create } from 'zustand';
import { UserState } from '../types/types';

const useUserStore = create<UserState>((set) => ({
    role: localStorage.getItem('userRole'),
    previousLastLogin: localStorage.getItem('userLastLogin') ? Number(localStorage.getItem('userLastLogin')) : null,

    setRole: (role: string | null) => {
        if (role === null) {
            localStorage.removeItem('userRole'); // Remove the item if role is null
        } else {
            localStorage.setItem('userRole', role); // Persist the role
        }
        set({ role });
    },
    setPreviousLastLogin: (lastLogin: number | null) => {
        if (lastLogin === null) {
            localStorage.removeItem('userLastLogin');
        } else {
            localStorage.setItem('userLastLogin', lastLogin.toString());
        }
        set({ previousLastLogin: lastLogin });
    }
}));

export { useUserStore };
