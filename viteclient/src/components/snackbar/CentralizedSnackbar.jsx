//CentralizedSnackbar.jsx
import { useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { SnackbarContext } from './SnackbarContext';

const CentralizedSnackbar = () => {
    const { openSnackbar, closeSnackbar, successMessage } = useContext(SnackbarContext);

    return (
        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={closeSnackbar}>
            <Alert onClose={closeSnackbar} severity='success'>
                {successMessage}
            </Alert>
        </Snackbar>
    );
};

export default CentralizedSnackbar;
