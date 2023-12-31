import { createContext, useState, FC, ReactNode } from 'react';
import { AlertColor } from '@mui/material/Alert';
import { SnackbarContextValue } from '../../types/types';

export const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

export const SnackbarProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [severity, setSeverity] = useState<AlertColor>('success');

    const showSnackbar = (message: string, severity: AlertColor = 'success') => {
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
