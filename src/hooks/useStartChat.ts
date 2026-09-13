import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';

/**
 * Opens (or reuses) the private thread with someone and navigates to it.
 * Visitors without an account are sent to the sign-in gate first.
 */
export function useStartChat() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const { user, requireAuth } = useAuth();
  const [starting, setStarting] = useState(false);

  const startChat = useCallback(
    async (peerId: string, advertId?: string) => {
      if (!user) {
        requireAuth('/messages');
        return;
      }
      if (peerId === user.id) return;
      setStarting(true);
      try {
        const conversation = await api.startConversation({ userId: peerId, advertId });
        router.push(`/messages/${conversation.id}` as any);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
      } finally {
        setStarting(false);
      }
    },
    [requireAuth, router, t, toast, user],
  );

  return { startChat, starting };
}
