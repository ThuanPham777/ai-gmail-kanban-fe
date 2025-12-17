export const EmailStatus = {
  INBOX: 'INBOX',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  SNOOZED: 'SNOOZED',
} as const;

export type EmailStatus = (typeof EmailStatus)[keyof typeof EmailStatus];

export interface KanbanEmailItem {
  _id: string;
  userId: string;
  provider: 'gmail';
  messageId: string;
  mailboxId?: string;

  senderName?: string;
  senderEmail?: string;
  subject?: string;
  snippet?: string;
  threadId?: string;

  status: EmailStatus;
  originalStatus?: EmailStatus;
  snoozeUntil?: string;

  summary?: string;
  lastSummarizedAt?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface KanbanBoardData {
  INBOX: KanbanEmailItem[];
  TODO: KanbanEmailItem[];
  IN_PROGRESS: KanbanEmailItem[];
  DONE: KanbanEmailItem[];
  SNOOZED: KanbanEmailItem[];
}

export interface KanbanBoardResponse {
  status: 'success';
  data: KanbanBoardData;
  meta: {
    pageSize: number;
    nextPageToken?: string | null;
    hasMore?: boolean;
    total?: {
      INBOX: number;
      TODO: number;
      IN_PROGRESS: number;
      DONE: number;
      SNOOZED: number;
    };
  };
}
