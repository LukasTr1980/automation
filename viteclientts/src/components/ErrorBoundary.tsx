// File: ErrorBoundary.tsx
import React from 'react';
import { SnackbarContext, SnackbarContextValue } from './snackbar/SnackbarContext';

interface ErrorBoundaryState {
    hasError: boolean;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<unknown>, ErrorBoundaryState> {
    static contextType = SnackbarContext;

    // Declare the context property type
    declare context: React.ContextType<typeof SnackbarContext>;

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    constructor(props: React.PropsWithChildren<unknown>) {
        super(props);
        this.state = { hasError: false };
    }

    componentDidCatch(): void {
        // Check if context is defined before using showSnackbar
        if (this.context) {
            const { showSnackbar } = this.context as SnackbarContextValue;
            showSnackbar('An unexpected error occurred.', 'error');
        }
    }

    render(): React.ReactNode {
        if (this.state?.hasError) {
            return <h1>Etwas ist schief gelaufen</h1>;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
