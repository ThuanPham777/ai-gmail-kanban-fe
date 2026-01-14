/**
 * KanbanEmailDetailDialog Component
 *
 * Modal dialog for viewing full email details from kanban board.
 * Features:
 * - Full email content display
 * - Sender information
 * - Attachments list
 * - Timestamp
 * - Loading skeleton
 */

import { useQuery } from '@tanstack/react-query';
import {
  getEmailDetail,
  type EmailDetailResponse,
  type EmailDetail,
} from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MailOpen, Paperclip, X, User, AtSign, Calendar } from 'lucide-react';

/**
 * Attachment row component
 */
