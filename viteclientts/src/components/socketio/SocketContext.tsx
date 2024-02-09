import { createContext, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { useUserStore } from '../../utils/store';
import useSnackbar from '../../utils/useSnackbar';
import { useStableTranslation } from '../../utils/useStableTranslation';
import { SocketProviderProps } from '../../types/types';

export const SocketContext = createContext<{ socket: Socket | null; connected: boolean }>({
  socket: null,
  connected: false,
});

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const { userLogin, jwtToken, logoutInProgress, setTokenAndExpiry, deviceId } = useUserStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { showSnackbar } = useSnackbar();
  const showSnackbarRef = useRef(showSnackbar);
  const stableTranslate = useStableTranslation();

  const apiUrlOriginal = import.meta.env.VITE_API_URL;
  const apiUrl = apiUrlOriginal.replace('/api', '');

  const connectSocket = (token: string) => {
    const newSocketInstance = io(apiUrl, {
      auth: { token: `Bearer ${token}` },
    });

    newSocketInstance.on('connect', () => setConnected(true));
    newSocketInstance.on('disconnect', () => setConnected(false));
    newSocketInstance.on('auth_error', refreshTokenAndReconnect);

    setSocket(newSocketInstance);
  };

  const refreshTokenAndReconnect = async () => {
    if (logoutInProgress) return;

    try {
      const refreshResponse = await axios.post(`${apiUrlOriginal}/refreshToken`, { username: userLogin, deviceId });
      if (refreshResponse.status === 200 && refreshResponse.data.accessToken) {
        setTokenAndExpiry(refreshResponse.data.accessToken);
        connectSocket(refreshResponse.data.accessToken);
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      showSnackbarRef.current(stableTranslate('anUnexpectedErrorOccurred'), 'error');
    }
  };

  useEffect(() => {
    if (jwtToken) {
      connectSocket(jwtToken);
    } else {
      refreshTokenAndReconnect();
    }
  
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userLogin, jwtToken]);

  useEffect(() => {
    showSnackbarRef.current = showSnackbar;
  }, [showSnackbar]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
