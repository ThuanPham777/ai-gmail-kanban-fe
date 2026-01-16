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
  pageSize = 20
): Promise<MailboxEmailsResponse> => {
  const safeId = encodeURIComponent(mailboxId);
  const response = await apiClient.get<MailboxEmailsResponse>(
    `/api/mailboxes/${safeId}/emails`,
    { params: { page, limit: pageSize } }
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
  pageSize = 20
): Promise<MailboxEmailsResponse> => {
  const safeId = encodeURIComponent(mailboxId);
  const response = await apiClient.get<MailboxEmailsResponse>(
    `/api/mailboxes/${safeId}/emails`,
    { params: { pageToken, limit: pageSize } }
  );
  return response.data;
};

/**
 * Fetches full details of a specific email
 * Includes body, headers, attachments, and labels
 * @param emailId - Gmail message ID
 */
export const getEmailDetail = async (
  emailId: string
): Promise<EmailDetailResponse> => {
  const safeId = encodeURIComponent(emailId);
  const response = await apiClient.get<EmailDetailResponse>(
    `/api/emails/${safeId}`
  );
  return response.data;
};

/**
 * Sends a new email
 * @param data - Email content (to, cc, bcc, subject, body)
 */
export const sendEmail = async (
  data: SendEmailData
): Promise<SendEmailResponse> => {
  const response = await apiClient.post<SendEmailResponse>(
    '/api/emails/send',
    data
  );
  return response.data;
};

/**
 * Replies to an existing email
 * @param emailId - Original email's message ID
 * @param data - Reply content (body, replyAll flag)
 */
export const replyEmail = async (
  emailId: string,
  data: ReplyEmailData
): Promise<ReplyEmailResponse> => {
  const safeId = encodeURIComponent(emailId);
  const response = await apiClient.post<ReplyEmailResponse>(
    `/api/emails/${safeId}/reply`,
    data
  );
  return response.data;
};

/**
 * Forwards an existing email
 * @param emailId - Original email id (mailboxId|messageId or raw messageId)
 * @param data - Forward content (to, cc, bcc, subject, body)
 */
export const forwardEmail = async (
  emailId: string,
  data: SendEmailData
): Promise<SendEmailResponse> => {
  const safeId = encodeURIComponent(emailId);
  const response = await apiClient.post<SendEmailResponse>(
    `/api/emails/${safeId}/forward`,
    data
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
  data: ModifyEmailData
): Promise<ModifyEmailResponse> => {
  const safeId = encodeURIComponent(emailId);
  const response = await apiClient.post<ModifyEmailResponse>(
    `/api/emails/${safeId}/modify`,
    data
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
  attachmentId: string
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
    '/api/gmail/watch/start'
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
