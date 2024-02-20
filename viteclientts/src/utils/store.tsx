import { create } from 'zustand';
import { UserState } from '../types/types';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import UAParser from 'ua-parser-js';

const useUserStore = create<UserState>((set) => ({
    userLogin: localStorage.getItem('userLogin'),
    jwtToken: null,
    hasVisitedBefore: localStorage.getItem('hasVisitedBefore') === 'true',
    tokenExpiry: null,
    logoutInProgress: false,
    deviceId: localStorage.getItem('deviceId'),
    userData: null,
    browserName: '',
    browserVersion: '',
    osName: '',
    osVersion: '',
    deviceModel: '',
    deviceType: '',
    deviceVendor: '',
    ua: '',

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

    setBrowserInfo: () => {
        const parser = new UAParser();
        const result = parser.getResult();
        set({
            browserName: result.browser.name || '',
            browserVersion: result.browser.version || '',
            osName: result.os.name || '',
            osVersion: result.os.version || '',
            deviceModel: result.device.model || '',
            deviceType: result.device.type || '',
            deviceVendor: result.device.vendor || '',
            ua: result.ua || ''
        });
    },

}));
export { useUserStore };
