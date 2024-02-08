import axios from "axios";
import { useUserStore } from "./store";

axios.interceptors.request.use(config => {

    const { jwtToken } = useUserStore.getState();
    if (jwtToken) {
        config.headers.Authorization = `Bearer ${jwtToken}`;
    }
    config.withCredentials = true;
    return config;
}, error => {
    return Promise.reject(error);
});