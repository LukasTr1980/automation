import * as envSwitcher from '../envSwitcher.js';
import logger from '../logger.js';
import { irrigationSwitchTopics, irrigationTuyaDatapoints } from './constants.js';

const baseUrl: string = envSwitcher.baseUrl;

interface UrlMap {
    [key: string]: string;
}

async function buildUrlMap(): Promise<UrlMap> {
    try {
        const urlMap: UrlMap = {};

        for (let i = 0; i < irrigationSwitchTopics.length; i++) {
            const topic: string = irrigationSwitchTopics[i];
            const dp: string = irrigationTuyaDatapoints[i];
            urlMap[topic] = `${baseUrl}/set/${dp}`;
        }
        return urlMap;
    } catch (error) {
        logger.error('Could not build urlMap object:', error);
        throw error;
    }
}

export { buildUrlMap };
