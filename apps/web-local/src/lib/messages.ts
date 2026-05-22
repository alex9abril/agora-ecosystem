import { apiRequest } from './api';

export type OutboundMessageStatus = 'queued' | 'sent' | 'failed' | 'skipped' | 'success';

export interface OutboundMessage {
  id: string;
  business_id: string | null;
  business_group_id: string | null;
  created_by_user_id: string | null;
  to_user_id: string | null;
  to_email: string;
  subject: string;
  body_html: string;
  trigger_type: string;
  status: OutboundMessageStatus;
  error_message?: string | null;
  created_at: string;
  sent_at?: string | null;
  updated_at?: string | null;
}

export interface ListMessagesResponse {
  total: number;
  items: OutboundMessage[];
  limit: number;
  offset: number;
}

export const messagesService = {
  async list(params: {
    business_id: string;
    to_email?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListMessagesResponse> {
    const qs = new URLSearchParams();
    qs.set('business_id', params.business_id);
    if (params.to_email) qs.set('to_email', params.to_email);
    if (params.status) qs.set('status', params.status);
    if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
    if (typeof params.offset === 'number') qs.set('offset', String(params.offset));
    return apiRequest(`/messages?${qs.toString()}`, { method: 'GET' });
  },

  async getById(params: { business_id: string; id: string }) {
    const qs = new URLSearchParams();
    qs.set('business_id', params.business_id);
    return apiRequest(`/messages/${params.id}?${qs.toString()}`, { method: 'GET' });
  },

  async sendCustomEmail(payload: {
    business_id: string;
    business_group_id?: string;
    to_email?: string;
    to_user_id?: string;
    order_id?: string;
    subject: string;
    body: string;
  }) {
    return apiRequest('/messages/email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

