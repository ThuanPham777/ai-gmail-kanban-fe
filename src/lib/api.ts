import { API_BASE_URL } from '@/config/env';
import axios from 'axios';
import { clearAllAuth, getAccessToken, setAccessToken, touchRefreshWatcher } from './auth';
import type { StoredUser } from './auth';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
    pendingRequests.forEach((cb) => cb(token));
    pendingRequests = [];
}

export interface RegisterData {
    email: string;
    password: string;
    name?: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface RegisterResponse {
    status: 'success';
    message: string;
    user: StoredUser;
}

export interface LoginResponse {
    status: 'success';
    message: string;
    accessToken: string;
    refreshToken: string;
    user: StoredUser;
    provider?: 'password' | 'google';
}

export interface RotateTokenResponse {
    status: 'success';
    message: string;
    accessToken: string;
    refreshToken: string;
}

export interface Mailbox {
    id: string;
    name: string;
    unread?: number;
}

export interface MailboxResponse {
    status: 'success';
    data: Mailbox[];
}

export interface EmailListItem {
    id: string;
    mailboxId: string;
    senderName: string;
    senderEmail: string;
    subject: string;
    preview: string;
    timestamp: string;
    starred: boolean;
    unread: boolean;
    important: boolean;
}

export interface MailboxEmailsResponse {
    status: 'success';
    data: EmailListItem[];
    meta: {
        total: number;
        page: number;
        pageSize: number;
    };
}

export interface EmailDetail extends EmailListItem {
    to: string[];
    cc?: string[];
    body: string;
    attachments?: {
        id: string;
        fileName: string;
        size: string;
        type: string;
    }[];
}

export interface EmailDetailResponse {
    status: 'success';
    data: EmailDetail;
}

export const registerUser = async (data: RegisterData): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>('/api/auth/register', data);
    return response.data;
};

export const loginUser = async (data: LoginData): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', data);
    return response.data;
};

export const loginWithGoogle = async (credential: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/auth/google', { credential });
    return response.data;
};

export const rotateTokens = async (refreshToken: string): Promise<RotateTokenResponse> => {
    const response = await apiClient.post<RotateTokenResponse>('/api/auth/refresh', { refreshToken });
    return response.data;
};

export const logoutUser = async (userId: string) => {
    const response = await apiClient.post<{ status: 'success'; message: string }>('/api/auth/logout', { userId });
    return response.data;
};

export const getMailboxes = async (): Promise<MailboxResponse> => {
    const response = await apiClient.get<MailboxResponse>('/api/mailboxes');
    return response.data;
};

export const getMailboxEmails = async (mailboxId: string, page = 1, pageSize = 20): Promise<MailboxEmailsResponse> => {
    const safeId = encodeURIComponent(mailboxId);
    const response = await apiClient.get<MailboxEmailsResponse>(`/api/mailboxes/${safeId}/emails`, {
        params: { page, limit: pageSize },
    });
    return response.data;
};


export const getEmailDetail = async (emailId: string): Promise<EmailDetailResponse> => {
    const safeId = encodeURIComponent(emailId);
    const response = await apiClient.get<EmailDetailResponse>(`/api/emails/${safeId}`);
    return response.data;
};

export interface SendEmailData {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
}

export interface SendEmailResponse {
    status: 'success';
    message: string;
    messageId: string;
}

export const sendEmail = async (data: SendEmailData): Promise<SendEmailResponse> => {
    const response = await apiClient.post<SendEmailResponse>('/api/emails/send', data);
    return response.data;
};

export interface ReplyEmailData {
    body: string;
    replyAll?: boolean;
}

export interface ReplyEmailResponse {
    status: 'success';
    message: string;
    messageId: string;
}

export const replyEmail = async (emailId: string, data: ReplyEmailData): Promise<ReplyEmailResponse> => {
    const safeId = encodeURIComponent(emailId);
    const response = await apiClient.post<ReplyEmailResponse>(`/api/emails/${safeId}/reply`, data);
    return response.data;
};

export interface ModifyEmailData {
    markRead?: boolean;
    markUnread?: boolean;
    star?: boolean;
    unstar?: boolean;
    delete?: boolean;
}

export interface ModifyEmailResponse {
    status: 'success';
    message: string;
}

export const modifyEmail = async (emailId: string, data: ModifyEmailData): Promise<ModifyEmailResponse> => {
    const safeId = encodeURIComponent(emailId);
    const response = await apiClient.post<ModifyEmailResponse>(`/api/emails/${safeId}/modify`, data);
    return response.data;
};

export const getAttachment = async (emailId: string, attachmentId: string): Promise<Blob> => {
    const response = await apiClient.get(`/api/attachments/${attachmentId}`, {
        params: { emailId },
        responseType: 'blob',
    });
    return response.data;
};

apiClient.interceptors.request.use((config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (res) => res,
    async (error) => {
        const originalRequest = error.config;
        const url: string = originalRequest?.url ?? '';
        const isAuthEndpoint =
            url.includes('/api/auth/refresh') ||
            url.includes('/api/auth/login') ||
            url.includes('/api/auth/logout') ||
            url.includes('/api/auth/register') ||
            url.includes('/api/auth/google');
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;
            const storedRefresh = localStorage.getItem('refreshToken');
            if (!storedRefresh) return Promise.reject(error);

            if (isRefreshing) {
                return new Promise((resolve) => {
                    pendingRequests.push((token: string) => {
                        originalRequest.headers = originalRequest.headers ?? {};
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(apiClient(originalRequest));
                    });
                });
            }

            isRefreshing = true;
            try {
                const data = await rotateTokens(storedRefresh);
                setAccessToken(data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                touchRefreshWatcher();
                onRefreshed(data.accessToken);
                originalRequest.headers = originalRequest.headers ?? {};
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return apiClient(originalRequest);
            } catch (e) {
                clearAllAuth();
                if (window.location.pathname !== '/login') {
                    window.location.assign('/login');
                }
                return Promise.reject(e);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
