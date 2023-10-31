// File: ErrorBoundary.jsx
import React from 'react';
import { SnackbarContext } from './snackbar/SnackbarContext';
import { PropTypes } from 'prop-types';

class ErrorBoundary extends React.Component {
    static contextType = SnackbarContext;

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch() {
        const { showSnackbar } = this.context;
        showSnackbar('An unexpected error occurred.', 'error');
    }

    render() {
        if (this.state?.hasError) {
            return  <h1>Etwas ist schief gelaufen</h1>;
        }
        return this.props.children;
    }
}
ErrorBoundary.propTypes = {
    children: PropTypes.node,
};

export default ErrorBoundary;
