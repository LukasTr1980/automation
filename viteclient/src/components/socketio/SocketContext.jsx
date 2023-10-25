// SocketContext.jsx
import { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';  // Import PropTypes
import { io } from 'socket.io-client';
import { useCookies } from 'react-cookie';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [cookies] = useCookies(['session']);
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);  // New state to track connection status

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
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
    }, [apiUrl, cookies.session]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>  {/* Provide connected status */}
            {children}
        </SocketContext.Provider>
    );
};

// Define PropTypes
SocketProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
