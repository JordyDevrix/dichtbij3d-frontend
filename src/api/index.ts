import { request, buildQuery, API_BASE_URL, ApiError } from './client';
import type {
  AdminAdvert,
  AdminMetrics,
  AdminUser,
  AdvertCreateRequest,
  AdvertDetail,
  AdvertSearchParams,
  AdvertSummary,
  AppNotification,
  AuditLogEntry,
  AuthResponse,
  ChatMessage,
  Conversation,
  Bid,
  CostEstimateRequest,
  CostEstimateResponse,
  MessageResponse,
  ModelCreateRequest,
  ModelDetail,
  ModelSummary,
  PageResponse,
  Passkey,
  PrinterModel,
  PublicStats,
  PublicUser,
  Reaction,
  Report,
  Role,
  Tag,
  TotpSetupResponse,
  UploadResponse,
  UserProfile,
} from './types';

export type FileLike = { uri: string; name: string; type: string } | Blob | File;

function toFormData(file: FileLike): FormData {
  const form = new FormData();
  form.append('file', file as any);
  return form;
}

export const api = {
  /* ---------------------------------------------------------------- auth */
  register: (body: { email: string; password: string; displayName: string; roles?: Role[]; locale?: string }) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body, auth: false }),

  login: (body: { email: string; password: string; totpCode?: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body, auth: false }),

  verifyMfa: (body: { mfaToken: string; code: string }) =>
    request<AuthResponse>('/api/auth/mfa/verify', { method: 'POST', body, auth: false }),

  logout: (refreshToken?: string | null) =>
    request<MessageResponse>('/api/auth/logout', { method: 'POST', body: { refreshToken } }),

  logoutAll: () => request<MessageResponse>('/api/auth/logout-all', { method: 'POST' }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<MessageResponse>('/api/auth/password', { method: 'POST', body }),

  totpSetup: () => request<TotpSetupResponse>('/api/auth/mfa/totp/setup', { method: 'POST' }),
  totpEnable: (code: string) =>
    request<MessageResponse>('/api/auth/mfa/totp/enable', { method: 'POST', body: { code } }),
  totpDisable: (code: string) =>
    request<MessageResponse>('/api/auth/mfa/totp/disable', { method: 'POST', body: { code } }),

  passkeys: () => request<Passkey[]>('/api/auth/passkeys'),
  passkeyRegisterOptions: () =>
    request<Record<string, any>>('/api/auth/passkeys/register/options', { method: 'POST' }),
  passkeyRegisterFinish: (credential: Record<string, any>, label?: string) =>
    request<MessageResponse>('/api/auth/passkeys/register/finish', {
      method: 'POST',
      body: { credential, label },
    }),
  passkeyLoginOptions: () =>
    request<Record<string, any>>('/api/auth/passkeys/login/options', { method: 'POST', auth: false }),
  passkeyLoginFinish: (credential: Record<string, any>) =>
    request<AuthResponse>('/api/auth/passkeys/login/finish', { method: 'POST', body: { credential }, auth: false }),
  deletePasskey: (id: string) => request<MessageResponse>(`/api/auth/passkeys/${id}`, { method: 'DELETE' }),

  /* ---------------------------------------------------------------- users */
  me: () => request<UserProfile>('/api/users/me'),
  updateMe: (body: Partial<UserProfile> & { roles?: Role[] }) =>
    request<UserProfile>('/api/users/me', { method: 'PATCH', body }),
  uploadAvatar: (file: FileLike) =>
    request<UserProfile>('/api/users/me/avatar', { method: 'POST', body: toFormData(file) }),
  publicProfile: (id: string) => request<PublicUser>(`/api/users/${id}`),

  /* ---------------------------------------------------------------- tags */
  tags: (q?: string, limit = 60) => request<Tag[]>('/api/tags', { query: { q, limit }, auth: false }),

  /* ---------------------------------------------------------------- adverts */
  adverts: (params: AdvertSearchParams = {}) =>
    request<PageResponse<AdvertSummary>>('/api/adverts', { query: params as any }),

  advert: (id: string) => request<AdvertDetail>(`/api/adverts/${id}`),

  createAdvert: (body: AdvertCreateRequest) =>
    request<AdvertDetail>('/api/adverts', { method: 'POST', body }),

  updateAdvert: (id: string, body: Partial<AdvertCreateRequest> & { status?: string }) =>
    request<AdvertDetail>(`/api/adverts/${id}`, { method: 'PATCH', body }),

  deleteAdvert: (id: string, reason?: string) =>
    request<MessageResponse>(`/api/adverts/${id}`, { method: 'DELETE', query: { reason } }),

  moderateDeleteAdvert: (id: string, reason: string) =>
    request<MessageResponse>(`/api/adverts/${id}/moderate/delete`, { method: 'POST', body: { reason } }),

  acceptAdvert: (id: string, opts: { reactionId?: string; userId?: string }) =>
    request<AdvertDetail>(`/api/adverts/${id}/accept`, { method: 'POST', query: opts }),

  setAdvertStatus: (id: string, status: string) =>
    request<AdvertDetail>(`/api/adverts/${id}/status`, { method: 'POST', query: { status } }),

  pingView: (id: string, dwellMillis: number) =>
    request<MessageResponse>(`/api/adverts/${id}/view`, { method: 'POST', body: { dwellMillis } }),

  addReaction: (id: string, body: { body: string; isApplication?: boolean }) =>
    request<Reaction>(`/api/adverts/${id}/reactions`, { method: 'POST', body }),

  deleteReaction: (id: string, reactionId: string, reason?: string) =>
    request<MessageResponse>(`/api/adverts/${id}/reactions/${reactionId}`, {
      method: 'DELETE',
      query: { reason },
    }),

  placeBid: (id: string, body: { amountCents: number; message?: string }) =>
    request<Bid>(`/api/adverts/${id}/bids`, { method: 'POST', body }),

  acceptBid: (id: string, bidId: string) =>
    request<AdvertDetail>(`/api/adverts/${id}/bids/${bidId}/accept`, { method: 'POST' }),

  rejectBid: (id: string, bidId: string) =>
    request<AdvertDetail>(`/api/adverts/${id}/bids/${bidId}/reject`, { method: 'POST' }),

  /* ---------------------------------------------------------------- models */
  models: (q?: string, page = 0, size = 20) =>
    request<PageResponse<ModelSummary>>('/api/models', { query: { q, page, size } }),
  myModels: () => request<ModelSummary[]>('/api/models/mine'),
  myLibrary: () => request<ModelSummary[]>('/api/models/library'),
  model: (id: string) => request<ModelDetail>(`/api/models/${id}`),
  createModel: (body: ModelCreateRequest) => request<ModelDetail>('/api/models', { method: 'POST', body }),
  deleteModel: (id: string) => request<MessageResponse>(`/api/models/${id}`, { method: 'DELETE' }),
  acquireModel: (id: string) => request<MessageResponse>(`/api/models/${id}/acquire`, { method: 'POST' }),
  modelDownloadUrl: (modelId: string, fileId: string) =>
    `${API_BASE_URL}/api/models/${modelId}/files/${fileId}/download`,

  /* ---------------------------------------------------------------- notifications */
  notifications: (page = 0, size = 30) =>
    request<PageResponse<AppNotification>>('/api/notifications', { query: { page, size } }),
  unreadCount: () => request<{ count: number }>('/api/notifications/unread-count'),
  markRead: (id: string) => request<MessageResponse>(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request<MessageResponse>('/api/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) => request<MessageResponse>(`/api/notifications/${id}`, { method: 'DELETE' }),

  /* ---------------------------------------------------------------- chat */
  conversations: (page = 0, size = 30) =>
    request<PageResponse<Conversation>>('/api/conversations', { query: { page, size } }),
  conversation: (id: string) => request<Conversation>(`/api/conversations/${id}`),
  startConversation: (body: { userId: string; advertId?: string; message?: string }) =>
    request<Conversation>('/api/conversations', { method: 'POST', body }),
  chatMessages: (id: string, page = 0, size = 40) =>
    request<PageResponse<ChatMessage>>(`/api/conversations/${id}/messages`, { query: { page, size } }),
  sendChatMessage: (id: string, body: string) =>
    request<ChatMessage>(`/api/conversations/${id}/messages`, { method: 'POST', body: { body } }),
  markConversationRead: (id: string) =>
    request<MessageResponse>(`/api/conversations/${id}/read`, { method: 'POST' }),
  unreadMessageCount: () => request<{ count: number }>('/api/conversations/unread-count'),

  /* ---------------------------------------------------------------- calculator */
  printers: () => request<PrinterModel[]>('/api/printers', { auth: false }),
  estimate: (body: CostEstimateRequest) =>
    request<CostEstimateResponse>('/api/calculator/estimate', { method: 'POST', body, auth: false }),

  /* ---------------------------------------------------------------- uploads */
  upload: (file: FileLike, folder = 'uploads') =>
    request<UploadResponse>('/api/uploads', { method: 'POST', body: toFormData(file), query: { folder } }),

  /* ---------------------------------------------------------------- reports */
  report: (body: { advertId?: string; userId?: string; reason: string }) =>
    request<MessageResponse>('/api/reports', { method: 'POST', body }),

  /* ---------------------------------------------------------------- public */
  stats: () => request<PublicStats>('/api/public/stats', { auth: false }),

  /* ---------------------------------------------------------------- admin */
  adminMetrics: () => request<AdminMetrics>('/api/admin/metrics'),
  adminUsers: (q?: string, page = 0, size = 25) =>
    request<PageResponse<AdminUser>>('/api/admin/users', { query: { q, page, size } }),
  adminUpdateUser: (id: string, body: { roles?: Role[]; enabled?: boolean; reason?: string }) =>
    request<AdminUser>(`/api/admin/users/${id}`, { method: 'PATCH', body }),
  adminDeleteUser: (id: string, reason?: string) =>
    request<MessageResponse>(`/api/admin/users/${id}`, { method: 'DELETE', query: { reason } }),
  adminAdverts: (page = 0, size = 25) =>
    request<PageResponse<AdminAdvert>>('/api/admin/adverts', { query: { page, size } }),
  adminRestoreAdvert: (id: string) =>
    request<MessageResponse>(`/api/admin/adverts/${id}/restore`, { method: 'POST' }),
  adminReports: () => request<Report[]>('/api/admin/reports'),
  adminResolveReport: (id: string, dismiss = false) =>
    request<MessageResponse>(`/api/admin/reports/${id}/resolve`, { method: 'POST', query: { dismiss } }),
  adminAuditLog: (page = 0, size = 50) =>
    request<PageResponse<AuditLogEntry>>('/api/admin/audit-log', { query: { page, size } }),
};

export { ApiError, API_BASE_URL, buildQuery };
export * from './types';
