// File: CentralizedSnackbar.jsx
import { useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { SnackbarContext } from './SnackbarContext';

const CentralizedSnackbar = () => {
    const { openSnackbar, closeSnackbar, message, severity } = useContext(SnackbarContext);  // Updated to use severity

    return (
        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={closeSnackbar}>
            <Alert onClose={closeSnackbar} severity={severity}>  {/* Updated to use severity */}
                {message}
            </Alert>
        </Snackbar>
    );
};

export default CentralizedSnackbar;
