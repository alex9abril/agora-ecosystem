import { apiRequest } from './api';

export interface InboxMessage {
  id: string;
  business_id: string | null;
  business_group_id: string | null;
  to_user_id: string | null;
  to_email: string;
  subject: string;
  body_html: string;
  trigger_type: string;
  status: string;
  error_message: string | null;
  read_at: string | null;
  created_at: string;
  sent_at: string | null;
  updated_at: string;
  business_name: string | null;
}

export interface InboxResponse {
  total: number;
  items: InboxMessage[];
  limit: number;
  offset: number;
}

export const messagesService = {
  inbox: (params?: { business_id?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.business_id) qs.set('business_id', params.business_id);
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.offset != null) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return apiRequest<InboxResponse>(`/messages/inbox${query ? `?${query}` : ''}`);
  },

  unreadCount: (params?: { business_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.business_id) qs.set('business_id', params.business_id);
    const query = qs.toString();
    return apiRequest<{ unread: number }>(`/messages/inbox/unread-count${query ? `?${query}` : ''}`);
  },

  markRead: (id: string) => apiRequest<{ id: string; read_at: string }>(`/messages/inbox/${id}/read`, { method: 'POST' }),
};

