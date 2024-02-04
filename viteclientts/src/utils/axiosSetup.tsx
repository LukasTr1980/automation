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

axios.interceptors.response.use(response => response, async (error) => {
    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true; 

        const apiUrl = import.meta.env.VITE_API_URL;
        const { userLogin } = useUserStore.getState();

        try {
            const refreshResponse = await axios.post(`${apiUrl}/refreshToken`, {
                username: userLogin,
            });

            if (refreshResponse.status === 200 && refreshResponse.data.accessToken) {
                useUserStore.setState({
                    jwtToken: refreshResponse.data.accessToken,
                    tokenExpiry: refreshResponse.data.expiresAt,
                });

                axios.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.data.accessToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${refreshResponse.data.accessToken}`;

                return axios(originalRequest); 
            }
        } catch (refreshError) {
            console.error('Failed to refresh token', refreshError);
            window.location.href = '/login';
            return Promise.reject(refreshError);
        }
    }

    return Promise.reject(error); 
});
