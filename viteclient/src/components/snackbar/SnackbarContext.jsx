//SnackbarContext.jsx
import { createContext, useState } from 'react';
import PropTypes from 'prop-types';  // Import PropTypes

export const SnackbarContext = createContext();

export const SnackbarProvider = ({ children }) => {
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const showSnackbar = (message) => {
        setSuccessMessage(message);
        setOpenSnackbar(true);
    };

    const closeSnackbar = () => {
        setOpenSnackbar(false);
    };

    return (
        <SnackbarContext.Provider value={{ showSnackbar, successMessage, openSnackbar, closeSnackbar }}>
            {children}
        </SnackbarContext.Provider>
    );
};

// Define PropTypes
SnackbarProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
