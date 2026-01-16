import type React from 'react';
import { useEffect, useState } from 'react';
import type { SendEmailData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

/**
 * Draft structure for composing a new email
 */
type ComposeDraft = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
};

/**
 * ComposeModal - Modal dialog for composing new emails or forwarding
 *
 * Features:
 * - Full email composer with To/CC/BCC fields
 * - Subject and body inputs
 * - Client-side validation (required recipient, subject, body)
 * - Loading state during send operation
 * - Parses comma-separated email addresses
 * - Pre-populates fields from draft prop
 *
 * @param draft - Initial values for the compose form
 * @param onClose - Handler to close the modal
 * @param onSend - Handler to submit the email
 * @param isLoading - Loading state during send operation
 */
export function ComposeModal({
  draft,
  onClose,
  onSend,
  isLoading,
}: {
  draft: ComposeDraft;
  onClose: () => void;
  onSend: (payload: SendEmailData) => void;
  isLoading?: boolean;
}) {
  // Form field states
  const [to, setTo] = useState(draft.to);
  const [cc, setCc] = useState(draft.cc);
  const [bcc, setBcc] = useState(draft.bcc);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reset form fields when draft prop changes
   * (e.g., switching between compose and forward)
   */
  useEffect(() => {
    setTo(draft.to);
    setCc(draft.cc);
    setBcc(draft.bcc);
    setSubject(draft.subject);
    setBody(draft.body);
    setError(null);
  }, [draft]);

  /**
   * Parses comma-separated email addresses into array
   * Trims whitespace and filters empty values
   */
  const parseAddresses = (value: string) =>
    value
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);

  /**
   * Validates and submits the email
   * Validates: recipient required, subject required, body required
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const toList = parseAddresses(to);
    const ccList = parseAddresses(cc);
    const bccList = parseAddresses(bcc);

    // Validation
    if (!toList.length) {
      setError('Please provide at least one recipient.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!body.trim()) {
      setError('Message body is required.');
      return;
    }

    // Submit
    setError(null);
    onSend({
      to: toList,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
      subject: subject.trim(),
      body,
    });
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div className='w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-xs uppercase tracking-[0.3em] text-muted-foreground'>
              Compose
            </p>
            <h2 className='text-xl font-semibold'>New message</h2>
          </div>
          <Button
            variant='ghost'
            onClick={onClose}
            disabled={isLoading}
          >
            Close
          </Button>
        </div>
        <form
          onSubmit={handleSubmit}
          className='mt-4 space-y-3'
        >
          <Input
            placeholder='To (comma-separated)'
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={isLoading}
          />
          <Input
            placeholder='Cc (comma-separated)'
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            disabled={isLoading}
          />
          <Input
            placeholder='Bcc (comma-separated)'
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            disabled={isLoading}
          />
          <Input
            placeholder='Subject'
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isLoading}
          />
          <textarea
            placeholder='Write your message…'
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isLoading}
            className='w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          />
          {error && <p className='text-sm text-destructive'>{error}</p>}
          <div className='flex justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Sending...
                </>
              ) : (
                'Send'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
