import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
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
            if (!user) {
                console.log('No user found in auth');
                set({ isClockedIn: false });
                return;
            }

            // Check localStorage for real attendance status
            const attendanceKey = `attendance_${user.id}`;
            const attendanceData = localStorage.getItem(attendanceKey);
            
            if (attendanceData) {
                const { clockedIn, clockInTime } = JSON.parse(attendanceData);
                // Check if clocked in today
                const today = new Date().toDateString();
                const clockInDate = new Date(clockInTime).toDateString();
                
                if (clockedIn && today === clockInDate) {
                    set({ isClockedIn: true });
                    console.log('User is clocked in today:', { userId: user.id, clockInTime });
                } else {
                    set({ isClockedIn: false });
                    // Clear old attendance data
                    localStorage.removeItem(attendanceKey);
                }
            } else {
                set({ isClockedIn: false });
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
