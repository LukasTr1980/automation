import { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { io } from 'socket.io-client';
import { useCookies } from 'react-cookie';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [cookies] = useCookies(['session']);
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (cookies.session) {  // Only establish a connection if session cookie is defined
            const socketInstance = io(apiUrl, {
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
