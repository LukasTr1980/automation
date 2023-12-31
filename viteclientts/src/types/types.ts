import React, { ReactNode } from 'react';
import { ButtonProps } from '@mui/material';
import { LinkProps as RouterLinkProps } from 'react-router-dom';
import { AlertColor } from '@mui/material/Alert';

export interface SchedulerCardProps {
    setReloadTasks: React.Dispatch<React.SetStateAction<boolean>>;
    scheduledTasks: ScheduledTask[];
    setScheduledTasks: React.Dispatch<React.SetStateAction<ScheduledTask[]>>;
    initialTopic?: string;
    mqttTopics?: string[];
    topicDescriptions?: string[];
    taskToCopy?: ScheduledTask | null;
}

export interface RecurrenceRule {
    hour: number;
    minute: number;
    dayOfWeek: number[];
    month: number[];
}

export interface ScheduledTask {
    recurrenceRule: RecurrenceRule;
    state: boolean;
    taskId: string;
    topic: string;
    id: string;
}

export interface ScheduledTaskCardProps {
    zoneName: string;
    tasks: ScheduledTask[];
    customLabels?: { [key: string]: string };
    onDelete?: (taskId: string) => void;
    redisKey?: string;
    onCopyTask: (task: ScheduledTask) => void;
}

export interface LayoutProps {
    title: string;
    children: ReactNode;
    showBackButton?: boolean;
    loading?: boolean;
    showNavMenu?: boolean;
    showLogo?: boolean;
}

export interface AuthGuardProps {
    children: ReactNode;
}

export interface CustomButtonProps extends ButtonProps {
    to?: RouterLinkProps['to'];
    error?: boolean;
    customWidth?: string | object;
}

export interface Countdown {
    topic?: string;
    value: number;
    control: string;
}

export interface CountdownCardProps {
    zoneName: string;
    countdown: Countdown;
}

export interface DialogFullScreenProps {
    open: boolean;
    onClose: () => void;
    children?: React.ReactNode;
}

export interface ErrorBoundaryState {
    hasError: boolean;
}

export interface MinuteFieldProps {
    selectedMinute: number | string;
    setSelectedMinute: (minute: string) => void; // Accepts only string now
    error?: boolean;
    min?: number;
    max?: number;
}

export interface MonthsSelectProps {
    selectedMonths: number[];
    setSelectedMonths: (months: number[]) => void;
}

export interface OnPressSwitchComponentProps {
    markiseState: string | null;
    onSend: (value: number) => void;
}

export interface SecretFieldProps {
    label: string;
    secretValue: string;
    placeholder?: boolean;
    isFocused: boolean;
    isValid: boolean;
    onFocus: () => void;
    onBlur: () => void;
    onChange: (value: string) => void;
    onUpdate: () => void;
    type?: string;
    autoComplete?: string;
}

export interface SwitchComponentProps {
    checked: boolean;
    label?: string;
    handleToggle?: (event: React.ChangeEvent<{ checked: boolean; }>) => void;
    disabled?: boolean;
    color?: 'primary' | 'secondary' | 'default' | 'error' | 'info' | 'success' | 'warning';
    id?: string;
    name?: string;
}

export interface WeekdaysSelectProps {
    selectedDays: number[];
    setSelectedDays: (days: number[]) => void;
}

export interface SnackbarContextValue {
    showSnackbar: (message: string, severity?: AlertColor) => void;
    message: string;
    severity: AlertColor;
    openSnackbar: boolean;
    closeSnackbar: () => void;
}

export interface APIResponse {
    [key: string]: Partial<ScheduledTask>[];
}

export interface GroupedTasks {
    [zoneName: string]: ScheduledTask[];
}

export interface MarkiseStatus {
    last_execution_timestamp?: string;
    throttling_active?: string;
    'weather:raining'?: string;
    'weather:windy'?: string;
}

export interface DetailedCountdown {
    value: number;
    hours: string;
    minutes: string;
    control: string;
}

export type CountdownsState = {
    [key: string]: DetailedCountdown | undefined;
};

export type HourFieldProps = {
    selectedHour: number | string;
    setSelectedHour: (value: string) => void;
    error?: boolean;
    min?: number;
    max?: number;
};

export type LoadingSpinnerProps = {
    size?: number;
};

export type SocketProviderProps = {
    children: ReactNode;
};