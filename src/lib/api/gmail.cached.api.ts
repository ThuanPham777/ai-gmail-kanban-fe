/**
 * Cached Gmail API Client with Stale-While-Revalidate Pattern
 *
 * FLOW:
 * 1. User opens Inbox
 * 2. Load emails from IndexedDB → Show UI immediately
 * 3. Call API (Gmail/Backend) in background
 * 4. Has new mail?
 *    - No → done
 *    - Yes → update UI + IndexedDB
 *
 * With Gmail Push integration:
 * Load cache → show UI → revalidate → Gmail push → backend sync → UI + cache update
 *
 * NOTE: Background revalidation updates cache silently.
 * UI updates happen via:
 * - React Query staleTime/refetchInterval
 * - Gmail Push notifications (force invalidate)
 */

import * as baseApi from './gmail.api';
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
import {
  getCachedEmail,
  cacheEmail,
  getCachedEmailList,
  cacheEmailList,
  getCachedMailboxes,
  cacheMailboxes,
  invalidateEmail,
  invalidateAllEmailListsForMailbox,
  invalidateMailboxes,
} from '../db/emailCache';

/**
 * Cached version of getMailboxes
 * TRUE Stale-While-Revalidate:
 * 1. Return cached data IMMEDIATELY if available
 * 2. Fetch fresh data in BACKGROUND (updates cache silently)
 * 3. Next query will get fresh data from cache
 */
export const getMailboxesCached = async (): Promise<MailboxResponse> => {
  // Try cache first
  const cached = await getCachedMailboxes();

  // If we have cached data, return it immediately and update cache in background
  if (cached) {
    // Background fetch - just update cache, don't trigger re-render
    baseApi
      .getMailboxes()
      .then(async (response) => {
        await cacheMailboxes(response.data.mailboxes);
      })
      .catch((err) => {
        console.warn('Background mailbox fetch failed:', err.message);
      });

    return {
      status: 'success',
      data: { mailboxes: cached.data },
    };
  }

  // No cache, must wait for fresh data
  const response = await baseApi.getMailboxes();
  await cacheMailboxes(response.data.mailboxes);
  return response;
};

/**
 * Cached version of getMailboxEmailsInfinite
 * TRUE Stale-While-Revalidate for email lists:
 * 1. Return cached data IMMEDIATELY
 * 2. Fetch fresh data in BACKGROUND (updates cache silently)
 * 3. Next query will get fresh data from cache
 */
export const getMailboxEmailsInfiniteCached = async (
  mailboxId: string,
  pageToken?: string,
  pageSize = 20
): Promise<MailboxEmailsResponse> => {
  // Try cache first
  const cached = await getCachedEmailList(mailboxId, pageToken);
  const isFirstPage = pageToken == null;

  // For first page with cache: return immediately, update cache in background
  if (isFirstPage && cached) {
    // Background fetch - just update cache silently
    baseApi
      .getMailboxEmailsInfinite(mailboxId, pageToken, pageSize)
      .then(async (response) => {
        await cacheEmailList(
          mailboxId,
          pageToken ?? null,
          response.data.data,
          response.data.meta
        );
      })
      .catch((err) => {
        console.warn('Background email fetch failed:', err.message);
      });

    // Return cached data immediately
    return {
      status: 'success',
      data: {
        data: cached.data,
        meta: cached.meta,
      },
    };
  }

  // For subsequent pages or no cache: fetch directly
  try {
    const response = await baseApi.getMailboxEmailsInfinite(
      mailboxId,
      pageToken,
      pageSize
    );

    await cacheEmailList(
      mailboxId,
      pageToken ?? null,
      response.data.data,
      response.data.meta
    );

    return response;
  } catch (error) {
    // Offline/temporary error fallback: serve cached data if available.
    if (cached) {
      return {
        status: 'success',
        data: {
          data: cached.data,
          meta: cached.meta,
        },
      };
    }
    throw error;
  }
};

/**
 * Cached version of getEmailDetail
 * TRUE Stale-While-Revalidate for individual emails:
 * 1. Return cached data IMMEDIATELY
 * 2. Fetch fresh data in BACKGROUND (updates cache silently)
 * 3. Next query will get fresh data from cache
 */
export const getEmailDetailCached = async (
  emailId: string
): Promise<EmailDetailResponse> => {
  // Try cache first
  const cached = await getCachedEmail(emailId);

  // If we have cached data, return it immediately and update cache in background
  if (cached) {
    // Background fetch - just update cache silently
    baseApi
      .getEmailDetail(emailId)
      .then(async (response) => {
        await cacheEmail(emailId, response.data);
      })
      .catch((err) => {
        console.warn('Background email detail fetch failed:', err.message);
      });

    // Return cached data immediately
    return {
      status: 'success',
      data: cached.data,
    };
  }

  // No cache, must wait for fresh data
  const response = await baseApi.getEmailDetail(emailId);
  await cacheEmail(emailId, response.data);
  return response;
};

/**
 * Send email (no caching, just invalidate list cache after send)
 */
export const sendEmailWithCacheInvalidation = async (
  data: SendEmailData
): Promise<SendEmailResponse> => {
  const response = await baseApi.sendEmail(data);

  // Invalidate SENT mailbox cache since we added a new email
  await invalidateAllEmailListsForMailbox();

  return response;
};

/**
 * Reply to email (invalidate cache after reply)
 */
export const replyEmailWithCacheInvalidation = async (
  emailId: string,
  data: ReplyEmailData
): Promise<ReplyEmailResponse> => {
  const response = await baseApi.replyEmail(emailId, data);

  // Invalidate the original email cache (thread might have changed)
  await invalidateEmail(emailId);
  // Invalidate SENT mailbox
  await invalidateAllEmailListsForMailbox();

  return response;
};

/**
 * Forward email (invalidate cache after forward)
 */
export const forwardEmailWithCacheInvalidation = async (
  emailId: string,
  data: SendEmailData
): Promise<SendEmailResponse> => {
  const response = await baseApi.forwardEmail(emailId, data);

  // Invalidate SENT mailbox
  await invalidateAllEmailListsForMailbox();

  return response;
};

/**
 * Modify email (star, read, delete) - invalidate cache after modification
 */
export const modifyEmailWithCacheInvalidation = async (
  emailId: string,
  data: ModifyEmailData
): Promise<ModifyEmailResponse> => {
  const response = await baseApi.modifyEmail(emailId, data);

  // Invalidate the email cache
  await invalidateEmail(emailId);

  // If deleting, invalidate all mailbox lists (email moved to trash/removed)
  if (data.delete) {
    await invalidateAllEmailListsForMailbox();
    await invalidateMailboxes(); // Unread counts changed
  } else {
    // Just invalidate affected mailboxes for star/read changes
    await invalidateAllEmailListsForMailbox();
    await invalidateMailboxes(); // Unread counts might have changed
  }

  return response;
};

/**
 * Download attachment (pass-through, no caching for binary data)
 */
export const downloadAttachment = baseApi.getAttachment;

/**
 * Export all cached versions as the default API
 * This allows you to swap imports from './api/gmail.api' to './api/gmail.cached.api'
 */
export {
  getMailboxesCached as getMailboxes,
  getMailboxEmailsInfiniteCached as getMailboxEmailsInfinite,
  getEmailDetailCached as getEmailDetail,
  sendEmailWithCacheInvalidation as sendEmail,
  replyEmailWithCacheInvalidation as replyEmail,
  forwardEmailWithCacheInvalidation as forwardEmail,
  modifyEmailWithCacheInvalidation as modifyEmail,
  downloadAttachment as getAttachment,
};
