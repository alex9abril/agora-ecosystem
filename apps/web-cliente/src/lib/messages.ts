import { apiRequest } from './api';

export interface InboxMessage {
  id: string;
  business_id: string | null;
  business_name?: string | null;
  subject: string;
  body_html: string;
  status: string;
  created_at: string;
}

export interface ListInboxResponse {
  total: number;
  items: InboxMessage[];
  limit: number;
  offset: number;
}

export const messagesService = {
  async inbox(params?: { limit?: number; offset?: number; business_id?: string }): Promise<ListInboxResponse> {
    const qs = new URLSearchParams();
    if (params?.business_id) qs.set('business_id', params.business_id);
    if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
    if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/messages/inbox${suffix}`, { method: 'GET' });
  },
};

