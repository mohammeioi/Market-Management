import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    pin_code: string | null;
    is_clocked_in?: boolean | null;
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
            if (!user) {
                console.log('No user found in auth');
                set({ isClockedIn: false });
                return;
            }

            // Sync with Supabase Database
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_clocked_in')
                .eq('user_id', user.id)
                .single();

            const isClockedInDb = profile?.is_clocked_in === true;

            // Still check LocalStorage to clean up if needed
            const attendanceKey = `attendance_${user.id}`;
            const attendanceData = localStorage.getItem(attendanceKey);

            if (isClockedInDb) {
                set({ isClockedIn: true });
                if (!attendanceData) {
                    localStorage.setItem(attendanceKey, JSON.stringify({ clockedIn: true, clockInTime: new Date().toISOString(), userId: user.id }));
                }
            } else {
                set({ isClockedIn: false });
                localStorage.removeItem(attendanceKey);
            }
        } catch (error) {
            console.error('Error checking status:', error);
            set({ isClockedIn: false });
        }
    },

    fetchProfiles: async () => {
        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
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
            if (!user) {
                return { success: false, error: 'User not authenticated' };
            }

            // Update Supabase profile
            const { error } = await supabase
                .from('profiles')
                .update({ is_clocked_in: true })
                .eq('user_id', user.id);

            if (error) throw error;

            // Store real attendance in localStorage
            const attendanceKey = `attendance_${user.id}`;
            const clockInTime = new Date().toISOString();
            const attendanceData = {
                clockedIn: true,
                clockInTime: clockInTime,
                userId: user.id
            };

            localStorage.setItem(attendanceKey, JSON.stringify(attendanceData));
            set({ isClockedIn: true });

            console.log('User clocked in successfully:', { userId: user.id, clockInTime });
            // Also refresh profiles to update UI
            get().fetchProfiles();
            return { success: true };
        } catch (error) {
            console.error('Clock in error:', error);
            return { success: false, error: 'Failed to clock in' };
        }
    },

    clockOut: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'User not authenticated' };
            }

            // Update Supabase profile
            const { error } = await supabase
                .from('profiles')
                .update({ is_clocked_in: false })
                .eq('user_id', user.id);

            if (error) throw error;

            // Remove from localStorage for real clock out
            const attendanceKey = `attendance_${user.id}`;
            const attendanceData = localStorage.getItem(attendanceKey);

            if (attendanceData) {
                const parsedData = JSON.parse(attendanceData);
                // Update with clock out time
                const updatedData = {
                    ...parsedData,
                    clockedIn: false,
                    clockOutTime: new Date().toISOString()
                };

                // Store clock out record (for attendance tracking)
                localStorage.setItem(`${attendanceKey}_history`, JSON.stringify(updatedData));

                // Remove current attendance
                localStorage.removeItem(attendanceKey);
            }

            set({ isClockedIn: false });
            console.log('User clocked out successfully:', { userId: user.id, clockOutTime: new Date().toISOString() });
            // Also refresh profiles to update UI
            get().fetchProfiles();
            return { success: true };
        } catch (error) {
            console.error('Clock out error:', error);
            return { success: false, error: 'Failed to clock out' };
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
