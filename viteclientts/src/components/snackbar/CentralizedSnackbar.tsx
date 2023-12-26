// File: CentralizedSnackbar.tsx
import { useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { SnackbarContext } from './SnackbarContext';

const CentralizedSnackbar = () => {
    const context = useContext(SnackbarContext);

    if (!context) {
        throw new Error('CentralizedSnackbar must be used within a SnackbarProvider');
    }

    const { openSnackbar, closeSnackbar, message, severity } = context;  // Updated to use severity

    return (
        <Snackbar
            open={openSnackbar}
            autoHideDuration={3000}
            onClose={closeSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
            <Alert onClose={closeSnackbar} severity={severity}>  {/* Updated to use severity */}
                {message}
            </Alert>
        </Snackbar>
    );
};

export default CentralizedSnackbar;
