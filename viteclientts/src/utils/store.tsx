import { create } from 'zustand';
import { UserState } from '../types/types';
import { UAParser } from 'ua-parser-js';

const useUserStore = create<UserState>((set) => ({
    browserName: '',
    browserVersion: '',
    osName: '',
    osVersion: '',
    deviceModel: '',
    deviceType: '',
    deviceVendor: '',
    ua: '',

    setBrowserInfo: () => {
        const parser = new UAParser();
        const result = parser.getResult();
        const browserVersionMajor = result.browser.version?.split('.')[0];
        set({
            browserName: result.browser.name || '',
            browserVersion: browserVersionMajor || '',
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
