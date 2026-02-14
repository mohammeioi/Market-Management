import { create } from 'zustand';

interface NotificationState {
    pushToken: string | null;
    setPushToken: (token: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    pushToken: null,
    setPushToken: (token) => set({ pushToken: token }),
}));
