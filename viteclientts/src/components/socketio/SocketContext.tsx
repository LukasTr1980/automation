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
  const { userLogin, role, setJwtToken, setTokenExpiry } = useUserStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { showSnackbar } = useSnackbar();
  const showSnackbarRef = useRef(showSnackbar);
  const stableTranslate = useStableTranslation();

  const apiUrlOriginal = import.meta.env.VITE_API_URL;
  const apiUrl = apiUrlOriginal.replace('/api', '');

  const refreshTokenAndConnect = async () => {
    try {
      const refreshResponse = await axios.post(`${apiUrlOriginal}/refreshToken`, { username: userLogin, role });
      if (refreshResponse.status === 200 && refreshResponse.data.accessToken) {
        setJwtToken(refreshResponse.data.accessToken);
        setTokenExpiry(refreshResponse.data.expiresAt);

        const newSocketInstance = io(apiUrl, {
          auth: {
            token: `Bearer ${refreshResponse.data.accessToken}`,
          },
        });

        newSocketInstance.on('connect', () => {
          setConnected(true);
        });

        newSocketInstance.on('disconnect', () => {
          setConnected(false);
        });

        newSocketInstance.on('auth_error', () => {
          refreshTokenAndConnect();
        });

        setSocket(newSocketInstance);
      } else {
        showSnackbarRef.current(stableTranslate('anUnexpectedErrorOccurred'), 'error');
      }
    } catch (error) {
      showSnackbarRef.current(stableTranslate('anUnexpectedErrorOccurred'), 'error');
      console.error('Failed to refresh token', error);
    }
  };

  useEffect(() => {
    refreshTokenAndConnect();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userLogin, role]); // Removed jwtToken from dependencies to avoid re-triggering on token update

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
