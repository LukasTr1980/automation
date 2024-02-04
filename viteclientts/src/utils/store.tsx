import { create } from 'zustand';
import { UserState } from '../types/types';

const useUserStore = create<UserState>((set) => ({
    userLogin: localStorage.getItem('userLogin'),
    previousLastLogin: localStorage.getItem('userLastLogin') ? Number(localStorage.getItem('userLastLogin')) : null,
    jwtToken: null,
    hasVisitedBefore: localStorage.getItem('hasVisitedBefore') === 'true',
    tokenExpiry: null,
    logoutInProgress: false,

    setUserLogin: (userLogin: string | null) => {
        if (userLogin === null) {
            localStorage.removeItem('userLogin');
        } else {
            localStorage.setItem('userLogin', userLogin);
        }
        set({ userLogin });
    },
    setPreviousLastLogin: (lastLogin: number | null) => {
        if (lastLogin === null) {
            localStorage.removeItem('userLastLogin');
        } else {
            localStorage.setItem('userLastLogin', lastLogin.toString());
        }
        set({ previousLastLogin: lastLogin });
    },
    setJwtToken: (token: string | null) => {
        set({ jwtToken: token }); // Function to update jwtToken in the store
    },
    clearJwtToken: () => {
        set({ jwtToken: null }); // Function to clear jwtToken from the store
    },
    setHasVisitedBefore: (visited: boolean | null) => {
        if (visited !== null) {
            localStorage.setItem('hasVisitedBefore', visited.toString());
        } else {
            localStorage.removeItem('hasVisitedBefore'); // Remove the item if visited is null
        }
        set({ hasVisitedBefore: visited });
    },
    setTokenExpiry: (expiry: number | null) => {
        set({ tokenExpiry: expiry });
    },
    setLogoutInProgress: (inProgress: boolean) => {
        set({ logoutInProgress: inProgress })
    }
}));

export { useUserStore };
