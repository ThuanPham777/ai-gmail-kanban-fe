/**
 * Gmail API Client
 * Provides functions to interact with Gmail through the backend API
 */
import apiClient from './client';
import type {
  MailboxResponse,
  MailboxEmailsResponse,
  EmailDetailResponse,
  SendEmailData,
  SendEmailResponse,
  ReplyEmailData,
  ReplyEmailResponse,
  ModifyEmailData,
  ModifyEmailResponse,
} from './types';

/**
 * Fetches all mailboxes (labels) available in the user's Gmail account
 * Returns system labels (INBOX, SENT, DRAFT) and custom labels
 */
export const getMailboxes = async (): Promise<MailboxResponse> => {
  const response = await apiClient.get<MailboxResponse>('/api/mailboxes');
  return response.data;
};

/**
 * Fetches emails from a specific mailbox using page-based pagination
 * @param mailboxId - Gmail label ID (e.g., "INBOX", "SENT")
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of emails per page
 * @deprecated Use getMailboxEmailsInfinite for better UX with infinite scroll
 */
export const getMailboxEmails = async (
  mailboxId: string,
  page = 1,
  pageSize = 20,
): Promise<MailboxEmailsResponse> => {
  const safeId = encodeURIComponent(mailboxId);
  const response = await apiClient.get<MailboxEmailsResponse>(
    `/api/mailboxes/${safeId}/emails`,
    { params: { page, limit: pageSize } },
  );
  return response.data;
};

/**
 * Fetches emails from a specific mailbox using token-based pagination
 * Supports infinite scroll by using Gmail's nextPageToken
 * @param mailboxId - Gmail label ID (e.g., "INBOX", "SENT")
 * @param pageToken - Token from previous response for next page
 * @param pageSize - Number of emails per request
 */
export const getMailboxEmailsInfinite = async (
  mailboxId: string,
  pageToken?: string,
  pageSize = 20,
): Promise<MailboxEmailsResponse> => {
  const safeId = encodeURIComponent(mailboxId);
  const response = await apiClient.get<MailboxEmailsResponse>(
    `/api/mailboxes/${safeId}/emails`,
    { params: { pageToken, limit: pageSize } },
  );
  return response.data;
};

/**
 * Fetches full details of a specific email
 * Includes body, headers, attachments, and labels
 * @param emailId - Gmail message ID
 */
export const getEmailDetail = async (
  emailId: string,
): Promise<EmailDetailResponse> => {
  const safeId = encodeURIComponent(emailId);
  const response = await apiClient.get<EmailDetailResponse>(
    `/api/emails/${safeId}`,
  );
  return response.data;
};

/**
 * Sends a new email
 * @param data - Email content (to, cc, bcc, subject, body, attachments)
 */
export const sendEmail = async (
  data: SendEmailData,
): Promise<SendEmailResponse> => {
  // If no attachments, use regular JSON request
  if (!data.attachments || data.attachments.length === 0) {
    const response = await apiClient.post<SendEmailResponse>(
      '/api/emails/send',
      {
        to: data.to,
        subject: data.subject,
        body: data.body,
        cc: data.cc,
        bcc: data.bcc,
      },
    );
    return response.data;
  }

  // With attachments, use FormData with JSON serialized data
  const formData = new FormData();
  // Serialize arrays as JSON strings for NestJS parsing
  formData.append('to', JSON.stringify(data.to));
  formData.append('subject', data.subject);
  formData.append('body', data.body);
  if (data.cc && data.cc.length > 0) {
    formData.append('cc', JSON.stringify(data.cc));
  }
  if (data.bcc && data.bcc.length > 0) {
    formData.append('bcc', JSON.stringify(data.bcc));
  }
  data.attachments.forEach((file) => {
    formData.append('attachments', file);
  });

  const response = await apiClient.post<SendEmailResponse>(
    '/api/emails/send',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};

/**
 * Replies to an existing email
 * @param emailId - Original email's message ID
 * @param data - Reply content (body, replyAll flag, attachments)
 */
export const replyEmail = async (
  emailId: string,
  data: ReplyEmailData,
): Promise<ReplyEmailResponse> => {
  const safeId = encodeURIComponent(emailId);

  // If no attachments, use regular JSON request
  if (!data.attachments || data.attachments.length === 0) {
    const response = await apiClient.post<ReplyEmailResponse>(
      `/api/emails/${safeId}/reply`,
      data,
    );
    return response.data;
  }

  // With attachments, use FormData
  const formData = new FormData();
  formData.append('body', data.body);
  if (data.replyAll !== undefined) {
    formData.append('replyAll', String(data.replyAll));
  }
  data.attachments.forEach((file) => {
    formData.append('attachments', file);
  });

  const response = await apiClient.post<ReplyEmailResponse>(
    `/api/emails/${safeId}/reply`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};

/**
 * Forwards an existing email
 * @param emailId - Original email id (mailboxId|messageId or raw messageId)
 * @param data - Forward content (to, cc, bcc, subject, body, attachments)
 */
export const forwardEmail = async (
  emailId: string,
  data: SendEmailData,
): Promise<SendEmailResponse> => {
  const safeId = encodeURIComponent(emailId);

  // If no attachments, use regular JSON request
  if (!data.attachments || data.attachments.length === 0) {
    const response = await apiClient.post<SendEmailResponse>(
      `/api/emails/${safeId}/forward`,
      {
        to: data.to,
        subject: data.subject,
        body: data.body,
        cc: data.cc,
        bcc: data.bcc,
      },
    );
    return response.data;
  }

  // With attachments, use FormData with JSON serialized data
  const formData = new FormData();
  formData.append('to', JSON.stringify(data.to));
  if (data.subject) {
    formData.append('subject', data.subject);
  }
  formData.append('body', data.body);
  if (data.cc && data.cc.length > 0) {
    formData.append('cc', JSON.stringify(data.cc));
  }
  if (data.bcc && data.bcc.length > 0) {
    formData.append('bcc', JSON.stringify(data.bcc));
  }
  data.attachments.forEach((file) => {
    formData.append('attachments', file);
  });

  const response = await apiClient.post<SendEmailResponse>(
    `/api/emails/${safeId}/forward`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};

/**
 * Modifies email labels and status
 * Can mark as read/unread, star/unstar, or delete (archive)
 * @param emailId - Email's message ID
 */
export const modifyEmail = async (
  emailId: string,
  data: ModifyEmailData,
): Promise<ModifyEmailResponse> => {
  const safeId = encodeURIComponent(emailId);
  const response = await apiClient.post<ModifyEmailResponse>(
    `/api/emails/${safeId}/modify`,
    data,
  );
  return response.data;
};

/**
 * Global email search - searches across ALL labels without label restrictions
 * Uses Gmail's q parameter for query-based search
 * @param query - Search query string (e.g., "from:user@example.com" or "subject:meeting")
 * @param pageToken - Token from previous response for pagination
 * @param pageSize - Number of emails per request
 */
export const searchEmails = async (
  query: string,
  pageToken?: string,
  pageSize = 20,
): Promise<MailboxEmailsResponse> => {
  const response = await apiClient.get<MailboxEmailsResponse>(
    `/api/emails/search`,
    { params: { q: query, pageToken, limit: pageSize } },
  );
  return response.data;
};

/**
 * Downloads an email attachment as a Blob
 * @param emailId - Email's message ID containing the attachment
 * @param attachmentId - Unique attachment identifier
 * @returns Blob data for file download
 */
export const getAttachment = async (
  emailId: string,
  attachmentId: string,
): Promise<Blob> => {
  const response = await apiClient.get(`/api/attachments/${attachmentId}`, {
    params: { emailId },
    responseType: 'blob',
  });
  return response.data;
};

// ============================================
// Gmail Watch (Push Notifications) API
// ============================================

export interface GmailWatchResponse {
  historyId: string;
  expiration: string;
}

/**
 * Starts Gmail push notifications watch
 * Sets up Google Pub/Sub to receive real-time email updates
 * @returns Watch response with historyId and expiration timestamp
 */
export const startGmailWatch = async (): Promise<GmailWatchResponse> => {
  const response = await apiClient.post<{ data: GmailWatchResponse }>(
    '/api/gmail/watch/start',
  );
  return response.data.data;
};

/**
 * Stops Gmail push notifications watch
 * Unsubscribes from Google Pub/Sub notifications
 */
export const stopGmailWatch = async (): Promise<void> => {
  await apiClient.post('/api/gmail/watch/stop');
};
