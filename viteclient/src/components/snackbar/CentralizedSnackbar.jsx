// File: CentralizedSnackbar.jsx
import { useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { SnackbarContext } from './SnackbarContext';

const CentralizedSnackbar = () => {
    const { openSnackbar, closeSnackbar, message, severity } = useContext(SnackbarContext);  // Updated to use severity

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
