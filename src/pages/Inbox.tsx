import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
    getEmailDetail,
    getMailboxEmails,
    getMailboxes,
    sendEmail,
    replyEmail,
    modifyEmail,
    getAttachment,
} from '@/lib/api';
import type {
    EmailDetail,
    EmailDetailResponse,
    EmailListItem,
    Mailbox,
    MailboxEmailsResponse,
    MailboxResponse,
    SendEmailData,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import {
    RefreshCcw,
    Plus,
    CheckSquare,
    Trash2,
    Star,
    StarOff,
    Reply,
    ReplyAll,
    Forward,
    Archive,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Paperclip,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PAGE_SIZE = 8;

type ComposeDraft = {
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
};

export default function Inbox() {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();
    const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [composeDraft, setComposeDraft] = useState<ComposeDraft | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
    const [isMobile, setIsMobile] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const mailboxesQuery = useQuery<MailboxResponse>({
        queryKey: ['mailboxes'],
        queryFn: getMailboxes,
    });

    // chọn mailbox đầu tiên (INBOX) khi load xong
    useEffect(() => {
        if (!selectedMailbox && mailboxesQuery.data?.data.length) {
            setSelectedMailbox(mailboxesQuery.data.data[0].id);
        }
    }, [mailboxesQuery.data, selectedMailbox]);

    const emailsQuery = useQuery<MailboxEmailsResponse>({
        queryKey: ['emails', selectedMailbox ?? 'unselected', page],
        queryFn: () => getMailboxEmails(selectedMailbox!, page, PAGE_SIZE),
        enabled: Boolean(selectedMailbox),
        placeholderData: (previous) => previous,
    });

    const emailDetailQuery = useQuery<EmailDetailResponse>({
        queryKey: ['email', selectedEmailId ?? 'none'],
        queryFn: () => getEmailDetail(selectedEmailId!),
        enabled: Boolean(selectedEmailId),
    });

    // responsive
    useEffect(() => {
        const media = window.matchMedia('(max-width: 1023px)');
        const handler = (event: MediaQueryListEvent | MediaQueryList) => {
            setIsMobile(event.matches);
            if (!event.matches) {
                setMobileView('list');
            }
        };
        handler(media);
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
    }, []);

    // đổi mailbox => reset lựa chọn & page
    useEffect(() => {
        setSelectedEmails([]);
        setSelectedEmailId(null);
        setPage(1);
    }, [selectedMailbox]);

    // đổi page => clear chọn
    useEffect(() => {
        setSelectedEmails([]);
    }, [page]);

    // nếu email đang chọn không còn trong page mới => chọn email đầu tiên
    useEffect(() => {
        if (!emailsQuery.data?.data.length) {
            setSelectedEmailId(null);
            return;
        }
        const stillExists = emailsQuery.data.data.some((email) => email.id === selectedEmailId);
        if (!stillExists) {
            setSelectedEmailId(emailsQuery.data.data[0].id);
        }
    }, [emailsQuery.data, selectedEmailId]);

    const totalPages = useMemo(() => {
        if (!emailsQuery.data?.meta.total) return 1;
        return Math.max(1, Math.ceil(emailsQuery.data.meta.total / PAGE_SIZE));
    }, [emailsQuery.data]);

    // tổng số email của mailbox theo API
    const totalEmails = emailsQuery.data?.meta.total ?? 0;

    const handleSelectEmail = (emailId: string) => {
        setSelectedEmailId(emailId);
        if (isMobile) setMobileView('detail');
    };

    const toggleSelectEmail = (emailId: string) => {
        setSelectedEmails((prev) =>
            prev.includes(emailId) ? prev.filter((id) => id !== emailId) : [...prev, emailId],
        );
    };

    const handleSelectAll = () => {
        if (!emailsQuery.data?.data.length) return;
        if (selectedEmails.length === emailsQuery.data.data.length) {
            setSelectedEmails([]);
        } else {
            setSelectedEmails(emailsQuery.data.data.map((email) => email.id));
        }
    };

    const showActionMessage = (message: string) => {
        setActionMessage(message);
        setTimeout(() => setActionMessage(null), 2500);
    };

    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
        await queryClient.invalidateQueries({ queryKey: ['emails', selectedMailbox] });
        if (selectedEmailId) {
            await queryClient.invalidateQueries({ queryKey: ['email', selectedEmailId] });
        }
        showActionMessage('Mailbox updated');
    };

    const sendEmailMutation = useMutation({
        mutationFn: sendEmail,
        onSuccess: () => {
            showActionMessage('Email sent successfully');
            queryClient.invalidateQueries({ queryKey: ['emails', selectedMailbox] });
            setComposeDraft(null);
        },
        onError: (error: any) => {
            showActionMessage(
                `Failed to send email: ${error.response?.data?.message || error.message}`,
            );
        },
    });

    // ✅ sửa mutation reply để update luôn email detail
    const replyEmailMutation = useMutation({
        mutationFn: ({
            emailId,
            body,
            replyAll,
        }: {
            emailId: string;
            body: string;
            replyAll?: boolean;
        }) => replyEmail(emailId, { body, replyAll }),

        onSuccess: (_data, variables) => {
            showActionMessage('Reply sent successfully');
            queryClient.invalidateQueries({ queryKey: ['emails', selectedMailbox] });

            // append nội dung reply của mình vào body hiện tại
            queryClient.setQueryData<EmailDetailResponse>(
                ['email', variables.emailId],
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        data: {
                            ...old.data,
                            body:
                                old.data.body +
                                `<hr /><p><strong>You replied:</strong></p><div>${variables.body}</div>`,
                        },
                    };
                },
            );
        },

        onError: (error: any) => {
            showActionMessage(
                `Failed to send reply: ${error.response?.data?.message || error.message}`,
            );
        },
    });

    const modifyEmailMutation = useMutation({
        mutationFn: ({ emailId, actions }: { emailId: string; actions: any }) =>
            modifyEmail(emailId, actions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails', selectedMailbox] });
            queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
            if (selectedEmailId) {
                queryClient.invalidateQueries({ queryKey: ['email', selectedEmailId] });
            }
        },
        onError: (error: any) => {
            showActionMessage(
                `Action failed: ${error.response?.data?.message || error.message}`,
            );
        },
    });

    const handleSendEmail = (payload: SendEmailData) => {
        sendEmailMutation.mutate(payload);
    };

    const handleReply = async (emailId: string, body: string, replyAll = false) => {
        await replyEmailMutation.mutateAsync({ emailId, body, replyAll });
    };

    const handleModifyEmail = (emailId: string, actions: any) => {
        modifyEmailMutation.mutate({ emailId, actions });
    };

    const handleBulkModify = async (actions: any, successMessage: string) => {
        if (!selectedEmails.length) {
            showActionMessage('Select at least one email first');
            return;
        }
        try {
            await Promise.all(
                selectedEmails.map((emailId) =>
                    modifyEmailMutation.mutateAsync({ emailId, actions }),
                ),
            );
            showActionMessage(successMessage);
            setSelectedEmails([]);
        } catch (error: any) {
            if (!error?.response) {
                showActionMessage(error?.message || 'Action failed');
            }
        }
    };

    const handleBulkMarkRead = () => handleBulkModify({ markRead: true }, 'Marked as read');
    const handleBulkMarkUnread = () =>
        handleBulkModify({ markUnread: true }, 'Marked as unread');
    const handleBulkDelete = () => handleBulkModify({ delete: true }, 'Moved to trash');

    const handleStarToggle = (emailId: string, starred: boolean) => {
        handleModifyEmail(emailId, starred ? { unstar: true } : { star: true });
    };

    const handleDownloadAttachment = async (
        emailId: string,
        attachmentId: string,
        fileName: string,
    ) => {
        try {
            console.log('Download request', { emailId, attachmentId, fileName });
            const blob = await getAttachment(emailId, attachmentId);
            console.log('Download request', { emailId, attachmentId, fileName });
            console.log('Blob?', blob, blob instanceof Blob);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showActionMessage(`Downloaded ${fileName}`);
        } catch (error: any) {
            showActionMessage(`Failed to download attachment: ${error.message}`);
        }
    };

    const currentEmails = emailsQuery.data?.data ?? [];
    const filteredEmails = useMemo(() => {
        if (!searchTerm.trim()) return currentEmails;
        const term = searchTerm.trim().toLowerCase();
        return currentEmails.filter(
            (email) =>
                email.senderName.toLowerCase().includes(term) ||
                email.subject.toLowerCase().includes(term) ||
                email.preview.toLowerCase().includes(term),
        );
    }, [currentEmails, searchTerm]);

    const emailDetail = emailDetailQuery.data?.data ?? null;

    const openCompose = (initial?: Partial<ComposeDraft>) => {
        setComposeDraft({
            to: '',
            cc: '',
            bcc: '',
            subject: '',
            body: '',
            ...initial,
        });
    };

    const handleForward = (email: EmailDetail) => {
        const subject = email.subject.startsWith('Fwd:')
            ? email.subject
            : `Fwd: ${email.subject}`;
        const forwardedBody = `
<p></p>
<hr />
<p><strong>From:</strong> ${email.senderName} &lt;${email.senderEmail}&gt;</p>
<p><strong>Date:</strong> ${new Date(email.timestamp).toLocaleString()}</p>
<p><strong>Subject:</strong> ${email.subject}</p>
<p><strong>To:</strong> ${email.to.join(', ')}</p>
<div>${email.body}</div>
`;
        openCompose({ subject, body: forwardedBody });
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <header className="border-b bg-card">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Mailbox
                        </p>
                        <h1 className="text-2xl font-semibold">Inbox workspace</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-medium">{user?.email}</p>
                            <p className="text-xs text-muted-foreground">
                                {user?.provider ?? 'password'} session
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => logout()}>
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {actionMessage && (
                <div className="mx-auto mt-4 w-full max-w-3xl px-4">
                    <Alert>
                        <AlertDescription>{actionMessage}</AlertDescription>
                    </Alert>
                </div>
            )}

            <main className="flex-1 overflow-hidden">
                {/* desktop layout */}
                <div className="hidden h-full grid-cols-[20%_40%_40%] gap-4 p-4 lg:grid">
                    <MailboxColumn
                        mailboxes={mailboxesQuery.data?.data ?? []}
                        isLoading={mailboxesQuery.isLoading}
                        selectedId={selectedMailbox}
                        onSelect={(id) => setSelectedMailbox(id)}
                        onCompose={() => openCompose()}
                    />
                    <EmailListColumn
                        emails={filteredEmails}
                        isLoading={emailsQuery.isLoading}
                        isFetching={emailsQuery.isFetching}
                        page={page}
                        totalPages={totalPages}
                        totalEmails={totalEmails}
                        onPageChange={setPage}
                        selectedEmails={selectedEmails}
                        onSelectEmail={handleSelectEmail}
                        onToggleSelect={toggleSelectEmail}
                        onSelectAll={handleSelectAll}
                        onRefresh={handleRefresh}
                        onMarkRead={handleBulkMarkRead}
                        onMarkUnread={handleBulkMarkUnread}
                        onDeleteSelected={handleBulkDelete}
                        onStarToggle={handleStarToggle}
                        onSearchChange={setSearchTerm}
                        searchTerm={searchTerm}
                        actionsDisabled={modifyEmailMutation.isPending}
                        activeEmailId={selectedEmailId}
                    />
                    <EmailDetailColumn
                        email={emailDetail}
                        isLoading={emailDetailQuery.isLoading}
                        hasSelection={Boolean(selectedEmailId)}
                        onBack={() => setMobileView('list')}
                        isMobile={false}
                        onReply={
                            selectedEmailId
                                ? (body, replyAll) => handleReply(selectedEmailId, body, replyAll)
                                : undefined
                        }
                        onModify={
                            selectedEmailId
                                ? (actions) => handleModifyEmail(selectedEmailId, actions)
                                : undefined
                        }
                        onDownloadAttachment={
                            selectedEmailId
                                ? (attachmentId, fileName) =>
                                    handleDownloadAttachment(selectedEmailId, attachmentId, fileName)
                                : undefined
                        }
                        isLoadingAction={replyEmailMutation.isPending || modifyEmailMutation.isPending}
                        onForward={handleForward}
                    />
                </div>

                {/* mobile layout */}
                <div className="lg:hidden p-4 space-y-4">
                    {mobileView === 'list' && (
                        <>
                            <MailboxColumn
                                mailboxes={mailboxesQuery.data?.data ?? []}
                                isLoading={mailboxesQuery.isLoading}
                                selectedId={selectedMailbox}
                                onSelect={(id) => setSelectedMailbox(id)}
                                onCompose={() => openCompose()}
                            />
                            <EmailListColumn
                                emails={filteredEmails}
                                isLoading={emailsQuery.isLoading}
                                isFetching={emailsQuery.isFetching}
                                page={page}
                                totalPages={totalPages}
                                totalEmails={totalEmails}
                                onPageChange={setPage}
                                selectedEmails={selectedEmails}
                                onSelectEmail={handleSelectEmail}
                                onToggleSelect={toggleSelectEmail}
                                onSelectAll={handleSelectAll}
                                onRefresh={handleRefresh}
                                onMarkRead={handleBulkMarkRead}
                                onMarkUnread={handleBulkMarkUnread}
                                onDeleteSelected={handleBulkDelete}
                                onStarToggle={handleStarToggle}
                                onSearchChange={setSearchTerm}
                                searchTerm={searchTerm}
                                actionsDisabled={modifyEmailMutation.isPending}
                                activeEmailId={selectedEmailId}
                                compact
                            />
                        </>
                    )}

                    {mobileView === 'detail' && (
                        <EmailDetailColumn
                            email={emailDetail}
                            isLoading={emailDetailQuery.isLoading}
                            hasSelection={Boolean(selectedEmailId)}
                            onBack={() => setMobileView('list')}
                            isMobile
                            onReply={
                                selectedEmailId
                                    ? (body, replyAll) => handleReply(selectedEmailId, body, replyAll)
                                    : undefined
                            }
                            onModify={
                                selectedEmailId
                                    ? (actions) => handleModifyEmail(selectedEmailId, actions)
                                    : undefined
                            }
                            onDownloadAttachment={
                                selectedEmailId
                                    ? (attachmentId, fileName) =>
                                        handleDownloadAttachment(selectedEmailId, attachmentId, fileName)
                                    : undefined
                            }
                            isLoadingAction={replyEmailMutation.isPending || modifyEmailMutation.isPending}
                            onForward={handleForward}
                        />
                    )}
                </div>
            </main>

            {composeDraft && (
                <ComposeModal
                    draft={composeDraft}
                    onClose={() => setComposeDraft(null)}
                    onSend={handleSendEmail}
                    isLoading={sendEmailMutation.isPending}
                />
            )}
        </div>
    );
}

function MailboxColumn({
    mailboxes,
    isLoading,
    selectedId,
    onSelect,
    onCompose,
}: {
    mailboxes: Mailbox[];
    isLoading: boolean;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onCompose: () => void;
}) {
    return (
        <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Mailboxes
                </p>
                <Button size="sm" variant="outline" className="gap-1" onClick={onCompose}>
                    <Plus className="h-4 w-4" />
                    Compose
                </Button>
            </div>
            <div className="max-h-[calc(100vh-220px)] overflow-auto">
                {isLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Loading folders…</div>
                ) : mailboxes.length ? (
                    <ul className="divide-y">
                        {mailboxes.map((mailbox) => (
                            <li key={mailbox.id}>
                                <button
                                    type="button"
                                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${selectedId === mailbox.id
                                        ? 'bg-primary/10 text-primary font-semibold'
                                        : 'hover:bg-muted/50'
                                        }`}
                                    onClick={() => onSelect(mailbox.id)}
                                >
                                    <span>{mailbox.name}</span>
                                    {typeof mailbox.unread === 'number' && (
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                                            {mailbox.unread}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-4 text-sm text-muted-foreground">No mailboxes available.</div>
                )}
            </div>
        </div>
    );
}

function EmailListColumn({
    emails,
    isLoading,
    isFetching,
    page,
    totalPages,
    totalEmails,
    onPageChange,
    selectedEmails,
    onSelectEmail,
    onToggleSelect,
    onSelectAll,
    onRefresh,
    onMarkRead,
    onMarkUnread,
    onDeleteSelected,
    onStarToggle,
    onSearchChange,
    searchTerm,
    actionsDisabled,
    activeEmailId,
    compact,
}: {
    emails: EmailListItem[];
    isLoading: boolean;
    isFetching: boolean;
    page: number;
    totalPages: number;
    totalEmails: number;
    onPageChange: (page: number) => void;
    selectedEmails: string[];
    onSelectEmail: (id: string) => void;
    onToggleSelect: (id: string) => void;
    onSelectAll: () => void;
    onRefresh: () => void;
    onMarkRead: () => void;
    onMarkUnread: () => void;
    onDeleteSelected: () => void;
    onStarToggle: (emailId: string, starred: boolean) => void;
    onSearchChange: (term: string) => void;
    searchTerm: string;
    actionsDisabled: boolean;
    activeEmailId: string | null;
    compact?: boolean;
}) {
    return (
        <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh}>
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={onSelectAll}>
                        <CheckSquare className="h-4 w-4" />
                        Select All
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMarkRead}
                        disabled={actionsDisabled || !selectedEmails.length}
                    >
                        Mark Read
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMarkUnread}
                        disabled={actionsDisabled || !selectedEmails.length}
                    >
                        Mark Unread
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDeleteSelected}
                        disabled={actionsDisabled || !selectedEmails.length}
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </Button>
                    {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <Input
                    type="search"
                    placeholder="Search emails"
                    className="mt-3"
                    value={searchTerm}
                    onChange={(event) => onSearchChange(event.target.value)}
                />
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Loading emails…
                    </div>
                ) : emails.length ? (
                    <ul>
                        {emails.map((email) => (
                            <li
                                key={email.id}
                                tabIndex={0}
                                className={`border-b px-4 py-3 outline-none transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring ${email.id === activeEmailId ? 'bg-primary/5' : ''
                                    }`}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onSelectEmail(email.id);
                                    }
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        className="mt-1 accent-primary"
                                        checked={selectedEmails.includes(email.id)}
                                        onChange={() => onToggleSelect(email.id)}
                                        aria-label={`Select email from ${email.senderName}`}
                                    />
                                    <div
                                        className={`flex-1 cursor-pointer rounded-lg px-2 py-1 ${email.id === activeEmailId ? 'bg-primary/10' : ''
                                            } ${compact ? 'text-sm' : ''}`}
                                        onClick={() => onSelectEmail(email.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold">
                                                {email.senderName}{' '}
                                                {email.unread && (
                                                    <span className="text-xs text-primary">• Unread</span>
                                                )}
                                            </p>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(email.timestamp).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium line-clamp-1">{email.subject}</p>
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {email.preview}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="text-muted-foreground hover:text-yellow-500 disabled:opacity-50"
                                        onClick={() => onStarToggle(email.id, email.starred)}
                                        disabled={actionsDisabled}
                                    >
                                        {email.starred ? (
                                            <Star className="h-4 w-4 fill-current" />
                                        ) : (
                                            <StarOff className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                        <MailIcon />
                        <p>No emails in this mailbox yet.</p>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                <p className="text-muted-foreground">
                    {totalEmails
                        ? `Showing ${emails.length} of ${totalEmails} emails · Page ${page} / ${totalPages}`
                        : `Showing ${emails.length} emails · Page ${page} / ${totalPages}`}
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(Math.max(1, page - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function EmailDetailColumn({
    email,
    isLoading,
    hasSelection,
    onBack,
    isMobile,
    onReply,
    onModify,
    onDownloadAttachment,
    isLoadingAction,
    onForward,
}: {
    email: EmailDetail | null;
    isLoading: boolean;
    hasSelection: boolean;
    onBack: () => void;
    isMobile: boolean;
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
    const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | null>(null);
    const [replyBody, setReplyBody] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

    const startReply = (mode: 'reply' | 'replyAll') => {
        if (!onReply) return;
        setReplyMode(mode);
        setReplyBody('');
    };

    const cancelReply = () => {
        setReplyMode(null);
        setReplyBody('');
    };

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

    const handleStarToggle = (currentlyStarred: boolean) => {
        if (onModify) {
            onModify(currentlyStarred ? { unstar: true } : { star: true });
        }
    };

    const handleArchive = () => {
        if (onModify) {
            onModify({ delete: true });
        }
    };

    return (
        <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    {isMobile && (
                        <Button variant="ghost" size="sm" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    )}
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Email detail
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleArchive}
                        disabled={isLoadingAction}
                    >
                        <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => email && handleStarToggle(email.starred)}
                        disabled={isLoadingAction || !email}
                    >
                        <Star className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Loading email…
                    </div>
                ) : email ? (
                    <article className="space-y-4">
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Subject</p>
                            <h2 className="text-2xl font-semibold">{email.subject}</h2>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-sm">
                                From <span className="font-semibold">{email.senderName}</span>{' '}
                                <span className="text-muted-foreground">
                                    &lt;{email.senderEmail}&gt;
                                </span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                                To: {email.to.join(', ')}
                                {email.cc?.length ? ` — Cc: ${email.cc.join(', ')}` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Received {new Date(email.timestamp).toLocaleString()}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startReply('reply')}
                                disabled={isLoadingAction || !onReply}
                            >
                                <Reply className="h-4 w-4" /> Reply
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startReply('replyAll')}
                                disabled={isLoadingAction || !onReply}
                            >
                                <ReplyAll className="h-4 w-4" /> Reply all
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => email && onForward && onForward(email)}
                                disabled={!onForward || !email || isLoadingAction}
                            >
                                <Forward className="h-4 w-4" /> Forward
                            </Button>
                        </div>
                        <div
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: email.body }}
                        />
                        {email.attachments?.length ? (
                            <div>
                                <p className="text-sm font-semibold mb-2">Attachments</p>
                                <div className="space-y-2">
                                    {email.attachments.map((attachment) => (
                                        <div
                                            key={attachment.id}
                                            className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium">{attachment.fileName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {attachment.size}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={!onDownloadAttachment}
                                                onClick={() =>
                                                    onDownloadAttachment &&
                                                    onDownloadAttachment(attachment.id, attachment.fileName)
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
                            <div className="rounded-lg border p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold">
                                        {replyMode === 'replyAll' ? 'Reply all' : 'Reply'}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelReply}
                                        disabled={submittingReply}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                                <textarea
                                    className="w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    rows={5}
                                    value={replyBody}
                                    onChange={(event) => setReplyBody(event.target.value)}
                                    placeholder="Write your reply…"
                                    disabled={submittingReply}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        onClick={submitReply}
                                        disabled={submittingReply || !replyBody.trim()}
                                    >
                                        {submittingReply ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                        <MailIcon />
                        <p>Select an email to view the full thread.</p>
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                        <MailIcon />
                        <p>No email selected.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ComposeModal({
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
    const [to, setTo] = useState(draft.to);
    const [cc, setCc] = useState(draft.cc);
    const [bcc, setBcc] = useState(draft.bcc);
    const [subject, setSubject] = useState(draft.subject);
    const [body, setBody] = useState(draft.body);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setTo(draft.to);
        setCc(draft.cc);
        setBcc(draft.bcc);
        setSubject(draft.subject);
        setBody(draft.body);
        setError(null);
    }, [draft]);

    const parseAddresses = (value: string) =>
        value
            .split(',')
            .map((email) => email.trim())
            .filter(Boolean);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const toList = parseAddresses(to);
        const ccList = parseAddresses(cc);
        const bccList = parseAddresses(bcc);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Compose
                        </p>
                        <h2 className="text-xl font-semibold">New message</h2>
                    </div>
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        Close
                    </Button>
                </div>
                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                    <Input
                        placeholder="To (comma-separated)"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        disabled={isLoading}
                    />
                    <Input
                        placeholder="Cc (comma-separated)"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                        disabled={isLoading}
                    />
                    <Input
                        placeholder="Bcc (comma-separated)"
                        value={bcc}
                        onChange={(e) => setBcc(e.target.value)}
                        disabled={isLoading}
                    />
                    <Input
                        placeholder="Subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        disabled={isLoading}
                    />
                    <textarea
                        placeholder="Write your message…"
                        rows={6}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        disabled={isLoading}
                        className="w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

const MailIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-12 w-12 text-muted-foreground"
    >
        <path d="M3 7l9 6 9-6" />
        <rect width="18" height="14" x="3" y="5" rx="2" ry="2" />
    </svg>
);
