import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";

export const NotificationService = {
    init: async () => {
        if (!Capacitor.isNativePlatform()) {
            console.log('Push notifications not supported on web');
            return;
        }

        try {
            // Create notification channel for orders with custom sound
            await PushNotifications.createChannel({
                id: 'orders_channel',
                name: 'New Orders',
                description: 'Notifications for new orders',
                importance: 5,
                visibility: 1,
                sound: 'notification_sound.mp3',
                vibration: true,
            });

            // Ensure 'default' channel also exists with high importance
            await PushNotifications.createChannel({
                id: 'default',
                name: 'Default',
                description: 'General notifications',
                importance: 5,
                visibility: 1,
                sound: 'default',
                vibration: true,
            });

            // enhance permission request logic
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            // Also check/request Local Notifications permissions
            let localPermStatus = await LocalNotifications.checkPermissions();
            if (localPermStatus.display === 'prompt') {
                localPermStatus = await LocalNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.log('User denied push permissions!');
            }

            await PushNotifications.register();

            // Listeners
            PushNotifications.addListener('registration', (token) => {
                console.log('Push registration success, token: ' + token.value);
                import('@/stores/useNotificationStore').then(({ useNotificationStore }) => {
                    useNotificationStore.getState().setPushToken(token.value);
                });

                // Save token to DB if user is logged in
                NotificationService.saveTokenToDb(token.value);

                toast.success("تم تفعيل الإشعارات بنجاح!", {
                    description: "يمكنك نسخ هوية الجهاز من الإعدادات لاختبار الإشعارات."
                });
            });

            PushNotifications.addListener('registrationError', (error) => {
                console.error('Error on registration: ' + JSON.stringify(error));
            });

            PushNotifications.addListener('pushNotificationReceived', async (notification) => {
                console.log('Push received: ' + JSON.stringify(notification));

                /* 
                   REMOVED: LocalNotifications.schedule is no longer needed because 
                   presentationOptions in capacitor.config.json handles foreground banners correctly.
                   Adding it here causes duplicate notifications.
                */

                // Still show toast for immediate feedback
                toast(notification.title || 'New Notification', {
                    description: notification.body,
                });
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('Push action performed: ' + JSON.stringify(notification));
                // Handle navigation or other actions here
            });

        } catch (e) {
            console.error('Error initializing push notifications', e);
        }
    },

    saveTokenToDb: async (token?: string) => {
        if (!token) {
            const { useNotificationStore } = await import('@/stores/useNotificationStore');
            token = useNotificationStore.getState().pushToken || localStorage.getItem('push_token') || undefined;
        }

        if (!token) {
            console.log('No token found to save');
            return;
        }

        // Persist to localStorage if not already
        if (token && token !== localStorage.getItem('push_token')) {
            localStorage.setItem('push_token', token);
        }

        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            console.log('Saving token to database for user:', user.id);
            const { error } = await supabase.from('user_fcm_tokens').upsert({
                user_id: user.id,
                token: token,
                last_updated: new Date().toISOString(),
                device_name: Capacitor.getPlatform() // Add device info
            }, { onConflict: 'user_id,token' });

            if (error) console.error('Error saving token to DB:', error);
            else console.log('Token saved successfully');
        }
    },

    getStoredToken: () => {
        return localStorage.getItem('push_token');
    },

    testLocalNotification: async () => {
        toast.info("Testing Push Token", {
            description: "To test real notifications, please initiate an order status change from another device."
        });
        console.log('Test notification triggered (mock)');
    }
};
