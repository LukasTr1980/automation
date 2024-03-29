import React, { ReactNode } from 'react';
import { AlertColor } from '@mui/material/Alert';
import { SxProps } from '@mui/material';

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
    showNavMenu?: boolean;
    showLogo?: boolean;
}

export interface AuthGuardProps {
    children: ReactNode;
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
    title?: string;
    showButton?: boolean;
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

export type UserType = {
    _id: string;
    username: string;
    lastLoginTime: number;
}

export interface UserState {
    browserName: string;
    browserVersion: string;
    osName: string;
    osVersion: string;
    deviceModel: string;
    deviceType: string;
    deviceVendor: string;
    ua: string;
    userLogin: string | null;
    setUserLogin: (userLogin: string | null) => void;
    jwtToken: string | null;
    clearJwtToken: () => void;
    hasVisitedBefore: boolean | null;
    setHasVisitedBefore: (hasVisited: boolean | null) => void;
    tokenExpiry: number | null;
    logoutInProgress: boolean;
    setLogoutInProgress: (inProgress: boolean) => void;
    setTokenAndExpiry: (token: string | null) => void;
    deviceId: string | null;
    setDeviceId: (deviceId: string | null) => void;
    fetchUserData: () => Promise<void>;
    userData: { userData: UserType[] } | null;
    setBrowserInfo: () => void;
}

export type DaysOfWeekNumbers = {
    [key: string]: number;
}

export type MonthsNumbers = {
    [key: string]: number;
}

export type ConvertToGermanDateFunction = (unixTimeStamp: number | null) => string | null;


export interface ErrorResponse {
    message: string;
    severity: AlertColor;
}

export type TokenExpiryCountdown = {
    value: string;
    expired: boolean;
}

export interface CopyrightProps {
    sx?: SxProps
}

export interface ImagePreloaderProps {
    imageUrls: string[];
    children: React.ReactNode;
}