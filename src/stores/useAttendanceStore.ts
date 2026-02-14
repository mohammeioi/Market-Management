import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    is_clocked_in: boolean | null;
    pin_code: string | null;
}

interface AttendanceState {
    isClockedIn: boolean;
    profiles: Profile[];
    loading: boolean;
    userPin: string | null;

    checkStatus: () => Promise<void>;
    fetchProfiles: () => Promise<void>;
    clockIn: () => Promise<{ success: boolean; error?: string }>;
    clockOut: () => Promise<{ success: boolean; error?: string }>;
    updatePin: (newPin: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
    isClockedIn: false,
    profiles: [],
    loading: false,
    userPin: null,

    checkStatus: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('is_clocked_in')
                .eq('user_id', user.id)
                .single();

            if (data && !error) {
                set({ isClockedIn: !!data.is_clocked_in });
            }
        } catch (error) {
            console.error('Error checking status:', error);
        }
    },

    fetchProfiles: async () => {
        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('is_clocked_in', { ascending: false }) // Show online users first
                .order('full_name', { ascending: true });

            if (error) throw error;
            set({ profiles: data as Profile[] });
        } catch (error) {
            console.error('Error fetching profiles:', error);
        } finally {
            set({ loading: false });
        }
    },

    clockIn: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'User not found' };

            const { error } = await supabase
                .from('profiles')
                .update({ is_clocked_in: true })
                .eq('user_id', user.id);

            if (error) throw error;

            set({ isClockedIn: true });
            get().fetchProfiles(); // Refresh list
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    clockOut: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'User not found' };

            const { error } = await supabase
                .from('profiles')
                .update({ is_clocked_in: false })
                .eq('user_id', user.id);

            if (error) throw error;

            set({ isClockedIn: false });
            get().fetchProfiles(); // Refresh list
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    updatePin: async (newPin: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'User not found' };

            const { error } = await supabase
                .from('profiles')
                .update({ pin_code: newPin })
                .eq('user_id', user.id);

            if (error) throw error;

            set({ userPin: newPin });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
}));
