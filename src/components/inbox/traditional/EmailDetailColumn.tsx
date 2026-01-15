import { useEffect, useMemo, useRef, useState } from 'react';
import type { EmailDetail } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Star,
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Loader2,
  ArrowLeft,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { MailIcon } from './MailIcon';
import { getGmailUrl } from '@/utils/emailUtils';
import { useAuth } from '@/context/AuthContext';

function sanitizeEmailHtml(html: string) {
  // Email bodies often rely on <style> tags for layout (like Gmail).
  // Rendering directly in the app can leak CSS and break the UI.
  // We keep a light sanitizer and render the result in an isolated iframe.
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Strip risky/active tags (keep <style> for email layout)
    const forbidden = doc.querySelectorAll(
      'script, meta, base, title, iframe, object, embed'
    );
    forbidden.forEach((n) => n.remove());

    // Remove inline event handlers (onload, onclick, ...)
    doc.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        if (/^on/i.test(attr.name)) {
          el.removeAttribute(attr.name);
        }
      }
    });

    // Normalize links and images
    doc.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (/^\s*javascript:/i.test(href)) {
        a.removeAttribute('href');
      }
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });

    doc.querySelectorAll('img').forEach((img) => {
      // Add max-width to prevent images from overflowing
      if (!img.style.maxWidth) {
        img.style.maxWidth = '100%';
      }
      if (!img.style.height || img.style.height === 'auto') {
        img.style.height = 'auto';
      }
      // Add loading="lazy" for better performance
      img.setAttribute('loading', 'lazy');

      const src = img.getAttribute('src') || '';
      if (/^\s*javascript:/i.test(src)) {
        img.removeAttribute('src');
      }

      // Make images clickable to open in new tab
      if (!img.parentElement || img.parentElement.tagName !== 'A') {
        const link = doc.createElement('a');
        link.href = img.src;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        img.parentNode?.replaceChild(link, img);
        link.appendChild(img);
      }
    });

    const safeDefaults = `
      <style>
        html, body { margin: 0; padding: 0; height: auto !important; min-height: 0 !important; }
        body {
          max-width: 100%;
          overflow-x: hidden;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        img, video { max-width: 100% !important; height: auto !important; }
        table { max-width: 100% !important; width: 100% !important; table-layout: fixed; }
        td, th { max-width: 100%; word-break: break-word; overflow-wrap: anywhere; }
        pre, code { white-space: pre-wrap !important; word-break: break-word; overflow-wrap: anywhere; }
        * { box-sizing: border-box; }
      </style>
    `;

    // Build srcDoc HTML (preserve email <style> in <head>)
    const head = doc.head?.innerHTML || '';
    const body = doc.body?.innerHTML || '';
    return `<!doctype html><html><head>${safeDefaults}${head}</head><body>${body}</body></html>`;
  } catch {
    return `<!doctype html><html><head></head><body>${html}</body></html>`;
  }
}

/**
 * EmailDetailColumn - Displays full email content with actions
 *
 * Features:
 * - Email metadata (from, to, subject, date)
 * - HTML body rendering with sanitization
 * - Action buttons (reply, forward, star, archive)
 * - Attachment download support
 * - Inline reply/reply-all composer
 * - "Open in Gmail" external link
 *
 * @param email - Full email details to display
 * @param isLoading - Loading state for initial email fetch
 * @param hasSelection - Whether an email is selected (shows placeholder if false)
 * @param onBack - Mobile back button handler
 * @param isMobile - Mobile layout flag
 * @param onReply - Reply/reply-all handler
 * @param onModify - Email action handler (star, archive, mark read)
 * @param onDownloadAttachment - Attachment download handler
 * @param isLoadingAction - Loading state for ongoing actions
 * @param onForward - Forward button handler
 */
export function EmailDetailColumn({
  email,
  isLoading,
  hasSelection,
  onBack,
  isMobile = false,
  onReply,
  onModify,
  onDownloadAttachment,
  isLoadingAction,
  onForward,
}: {
  email: EmailDetail | null;
  isLoading: boolean;
  hasSelection: boolean;
  onBack?: () => void;
  isMobile?: boolean;
  onReply?: (body: string, replyAll?: boolean) => Promise<void>;
  onModify?: (actions: {
    markRead?: boolean;
    markUnread?: boolean;
    star?: boolean;
    unstar?: boolean;
    delete?: boolean;
  }) => void;
  onDownloadAttachment?: (attachmentId: string, fileName: string) => void;
  isLoadingAction?: boolean;
  onForward?: (email: EmailDetail) => void;
}) {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(420);
  // Reply composer state
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const safeBodyHtml = useMemo(() => {
    return email?.body ? sanitizeEmailHtml(email.body) : '';
  }, [email?.body]);

  useEffect(() => {
    // Auto-size the iframe so that scrolling happens in the outer column only.
    // This reads the iframe document height (same-origin via srcDoc).
    const iframe = iframeRef.current;
    if (!iframe || !safeBodyHtml) return;

    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const doc = iframe.contentDocument;
      const body = doc?.body;
      if (!body) return;

      const rectHeight = Math.ceil(body.getBoundingClientRect().height);
      const scrollHeight = Math.ceil(body.scrollHeight);
      const offsetHeight = Math.ceil(body.offsetHeight);

      // Prefer body metrics (some templates set html/min-height causing huge extra space)
      let next = Math.max(rectHeight, scrollHeight, offsetHeight);

      // Clamp obvious overestimates (prevents blank scroll space)
      if (rectHeight > 0 && next > rectHeight + 800) {
        next = rectHeight;
      }

      if (Number.isFinite(next) && next > 0) setIframeHeight(next);
    };

    const onLoad = () => {
      measure();

      const doc = iframe.contentDocument;
      const body = doc?.body;
      if (!doc || !body) return;

      // Re-measure when images load (common source of late height changes)
      const images = Array.from(doc.images || []);
      for (const img of images) {
        img.addEventListener('load', measure);
        img.addEventListener('error', measure);
      }

      // Observe DOM changes inside email content
      mutationObserver = new MutationObserver(() => measure());
      mutationObserver.observe(body, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      // Observe layout changes (best-effort; may not exist in older browsers)
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => measure());
        resizeObserver.observe(body);
      }

      // A couple of delayed measures to catch late layout shifts
      window.setTimeout(measure, 50);
      window.setTimeout(measure, 250);
      window.setTimeout(measure, 750);
    };

    iframe.addEventListener('load', onLoad);
    // If already loaded, try measuring immediately
    window.setTimeout(measure, 0);

    return () => {
      cancelled = true;
      iframe.removeEventListener('load', onLoad);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
    };
  }, [safeBodyHtml]);

  /**
   * Initiates reply mode (reply or reply-all)
   */
  const startReply = (mode: 'reply' | 'replyAll') => {
    if (!onReply) return;
    setReplyMode(mode);
    setReplyBody('');
  };

  /**
   * Closes reply composer and clears draft
   */
  const cancelReply = () => {
    setReplyMode(null);
    setReplyBody('');
  };

  /**
   * Sends the reply and closes composer on success
   */
  const submitReply = async () => {
    if (!replyMode || !onReply || !replyBody.trim()) return;
    try {
      setSubmittingReply(true);
      await onReply(replyBody, replyMode === 'replyAll');
      cancelReply();
    } finally {
      setSubmittingReply(false);
    }
  };

  /**
   * Toggles star status of current email
   */
  const handleStarToggle = (currentlyStarred: boolean) => {
    if (onModify) {
      onModify(currentlyStarred ? { unstar: true } : { star: true });
    }
  };

  /**
   * Archives (deletes) the current email
   */
  const handleArchive = () => {
    if (onModify) {
      onModify({ delete: true });
    }
  };

  return (
    <div className='flex h-full flex-col rounded-xl border bg-card shadow-sm min-h-0 min-w-0 overflow-hidden'>
      <div className='flex items-center justify-between border-b px-4 py-3 shrink-0'>
        <div className='flex items-center gap-2'>
          {isMobile && onBack && (
            <Button
              variant='ghost'
              size='sm'
              onClick={onBack}
            >
              <ArrowLeft className='h-4 w-4' />
              Back
            </Button>
          )}
          <p className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
            Email detail
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleArchive}
                disabled={isLoadingAction}
              >
                <Archive className='h-4 w-4' />
              </Button>
            </TooltipTrigger>

            <TooltipContent
              side='bottom'
              sideOffset={6}
            >
              Archive
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => email && handleStarToggle(email.starred)}
                disabled={isLoadingAction || !email}
              >
                <Star className='h-4 w-4' />
              </Button>
            </TooltipTrigger>

            <TooltipContent
              side='bottom'
              sideOffset={6}
            >
              {email?.starred ? 'Remove star' : 'Add star'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className='flex-1 overflow-y-auto min-h-0 p-4 scrollbar-thin touch-scroll smooth-scroll'>
        {isLoading ? (
          <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
            Loading email…
          </div>
        ) : email ? (
          <article className='space-y-4'>
            <div>
              <p className='text-xs uppercase text-muted-foreground'>Subject</p>
              <h2 className='text-2xl font-semibold'>{email.subject}</h2>
            </div>
            <div className='rounded-lg border p-3'>
              <p className='text-sm'>
                From <span className='font-semibold'>{email.senderName}</span>{' '}
                <span className='text-muted-foreground'>
                  &lt;{email.senderEmail}&gt;
                </span>
              </p>
              <p className='text-sm text-muted-foreground'>
                To: {email.to.join(', ')}
                {email.cc?.length ? ` — Cc: ${email.cc.join(', ')}` : ''}
              </p>
              <p className='text-xs text-muted-foreground'>
                Received {new Date(email.timestamp).toLocaleString()}
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => startReply('reply')}
                disabled={isLoadingAction || !onReply}
              >
                <Reply className='h-4 w-4' /> Reply
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => startReply('replyAll')}
                disabled={isLoadingAction || !onReply}
              >
                <ReplyAll className='h-4 w-4' /> Reply all
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => email && onForward && onForward(email)}
                disabled={!onForward || !email || isLoadingAction}
              >
                <Forward className='h-4 w-4' /> Forward
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  if (email?.id) {
                    const messageId = email.id.split('|')[1] || email.id;
                    window.open(getGmailUrl(messageId, user?.email), '_blank');
                  }
                }}
                disabled={!email}
                title='Open in Gmail'
              >
                <ExternalLink className='h-4 w-4' /> Open in Gmail
              </Button>
            </div>
            <iframe
              title='Email content'
              ref={iframeRef}
              className='w-full rounded-md border bg-background'
              style={{ height: iframeHeight }}
              scrolling='no'
              sandbox='allow-same-origin allow-popups'
              srcDoc={safeBodyHtml}
            />
            {email.attachments?.length ? (
              <div>
                <p className='text-sm font-semibold mb-2'>Attachments</p>
                <div className='space-y-2'>
                  {email.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className='flex items-center justify-between rounded border px-3 py-2 text-sm'
                    >
                      <div className='flex items-center gap-2'>
                        <Paperclip className='h-4 w-4 text-muted-foreground' />
                        <div>
                          <p className='font-medium'>{attachment.fileName}</p>
                          <p className='text-xs text-muted-foreground'>
                            {attachment.size}
                          </p>
                        </div>
                      </div>
                      <Button
                        size='sm'
                        variant='ghost'
                        disabled={!onDownloadAttachment}
                        onClick={() =>
                          onDownloadAttachment &&
                          onDownloadAttachment(
                            attachment.id,
                            attachment.fileName
                          )
                        }
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {replyMode && (
              <div className='rounded-lg border p-3 space-y-3'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-semibold'>
                    {replyMode === 'replyAll' ? 'Reply all' : 'Reply'}
                  </p>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={cancelReply}
                    disabled={submittingReply}
                  >
                    Cancel
                  </Button>
                </div>
                <textarea
                  className='w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  rows={5}
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder='Write your reply…'
                  disabled={submittingReply}
                />
                <div className='flex justify-end'>
                  <Button
                    onClick={submitReply}
                    disabled={submittingReply || !replyBody.trim()}
                  >
                    {submittingReply ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Sending…
                      </>
                    ) : (
                      'Send reply'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </article>
        ) : hasSelection ? (
          <div className='flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground'>
            <MailIcon />
            <p>Select an email to view the full thread.</p>
          </div>
        ) : (
          <div className='flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground'>
            <MailIcon />
            <p>No email selected.</p>
          </div>
        )}
      </div>
    </div>
  );
}
