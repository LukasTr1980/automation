import { create } from 'zustand';
import { UserState } from '../types/types';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const useUserStore = create<UserState>((set) => ({
    userLogin: localStorage.getItem('userLogin'),
    jwtToken: null,
    hasVisitedBefore: localStorage.getItem('hasVisitedBefore') === 'true',
    tokenExpiry: null,
    logoutInProgress: false,
    deviceId: localStorage.getItem('deviceId'),
    userData: null,

    setUserLogin: (userLogin: string | null) => {
        if (userLogin === null) {
            localStorage.removeItem('userLogin');
        } else {
            localStorage.setItem('userLogin', userLogin);
        }
        set({ userLogin });
    },

    setTokenAndExpiry: (token: string | null) => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const expiry = decoded.exp;
                set({ jwtToken: token, tokenExpiry: expiry });
            } catch (error) {
                console.error('Failed to decode token:', error);
            }
        } else {
            set({ jwtToken: null, tokenExpiry: undefined });
        }
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

    setLogoutInProgress: (inProgress: boolean) => {
        set({ logoutInProgress: inProgress })
    },
    
    setDeviceId: (deviceId: string | null) => {
        if (deviceId === null) {
            localStorage.removeItem('deviceId');
        } else {
            localStorage.setItem('deviceId', deviceId);
        }
        set({ deviceId });
    },

    fetchUserData: async () => {
        try {
          const apiUrl = import.meta.env.VITE_API_URL;
          const response = await axios.get(`${apiUrl}/userData`);
          set({ userData: response.data });
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      },

}));
export { useUserStore };
