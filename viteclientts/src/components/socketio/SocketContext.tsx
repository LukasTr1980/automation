import { createContext, useState, useEffect, ReactNode } from 'react';
import PropTypes from 'prop-types';
import { io, Socket } from 'socket.io-client';
import { useCookies } from 'react-cookie';

export const SocketContext = createContext<{ socket: Socket | null; connected: boolean }>({
  socket: null,
  connected: false,
});

type SocketProviderProps = {
  children: ReactNode;
};

export const SocketProvider = ({ children }: SocketProviderProps) => {
    const [cookies] = useCookies(['session']);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL.replace('/api', '');

    useEffect(() => {
        if (cookies.session) {  // Only establish a connection if session cookie is defined
            const socketInstance: Socket = io(apiUrl, {
                query: {
                    session: cookies.session
                }
            });
            setSocket(socketInstance);

            // Event handlers to update the connected state
            socketInstance.on('connect', () => {
                setConnected(true);
            });
            socketInstance.on('disconnect', () => {
                setConnected(false);
            });

            return () => {
                socketInstance.disconnect();
            };
        }
    }, [apiUrl, cookies.session]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};

SocketProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
