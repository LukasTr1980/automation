// File: SnackbarContext.jsx
import { createContext, useState } from 'react';
import PropTypes from 'prop-types';  // Import PropTypes

export const SnackbarContext = createContext();

export const SnackbarProvider = ({ children }) => {
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('success');  // New state to handle severity

    const showSnackbar = (message, severity = 'success') => {  // Updated to handle severity
        setMessage(message);
        setSeverity(severity);
        setOpenSnackbar(true);
    };

    const closeSnackbar = () => {
        setOpenSnackbar(false);
    };

    return (
        <SnackbarContext.Provider value={{ showSnackbar, message, severity, openSnackbar, closeSnackbar }}>
            {children}
        </SnackbarContext.Provider>
    );
};

// Define PropTypes
SnackbarProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
