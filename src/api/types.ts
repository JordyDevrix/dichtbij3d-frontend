/**
 * TypeScript mirrors of the backend DTOs (nl.dichtbij3d.backend.dto).
 * Keep in sync with Dtos.kt.
 */

export type Role = 'CUSTOMER' | 'PRINTER' | 'MODELLER' | 'ADMIN';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'RATHER_NOT_SAY';
export type AdvertType = 'PRINT_REQUEST' | 'MODEL_REQUEST' | 'MODEL_FOR_SALE' | 'PRINT_FOR_SALE';
export type AdvertStatus = 'OPEN' | 'ACCEPTED' | 'COMPLETED' | 'SOLD' | 'CANCELLED' | 'REMOVED';
export type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type ModelVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
export type ModelLicense = 'CC0' | 'CC_BY' | 'CC_BY_NC' | 'CC_BY_SA' | 'COMMERCIAL' | 'ALL_RIGHTS_RESERVED';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

/** Fixed platform taxonomy - mirrors nl.dichtbij3d.backend.domain.Category. */
export type Category =
  | 'HOME_LIVING'
  | 'HOMELAB_IT'
  | 'ELECTRONICS_CASES'
  | 'TOOLS_WORKSHOP'
  | 'SPARE_PARTS_REPAIR'
  | 'AUTOMOTIVE'
  | 'RC_DRONES'
  | 'TOYS_GAMES'
  | 'TABLETOP_MINIATURES'
  | 'COSPLAY_PROPS'
  | 'ART_DECOR'
  | 'JEWELRY_FASHION'
  | 'KITCHEN_DINING'
  | 'GARDEN_OUTDOOR'
  | 'SPORTS_OUTDOOR'
  | 'PETS'
  | 'EDUCATION_SCIENCE'
  | 'MEDICAL_ASSISTIVE'
  | 'OTHER';
export type NotificationType =
  | 'ADVERT_REACTION'
  | 'ADVERT_ACCEPTED'
  | 'ADVERT_REMOVED'
  | 'BID_PLACED'
  | 'ADVERT_PURCHASE_REQUEST'
  | 'BID_ACCEPTED'
  | 'BID_REJECTED'
  | 'MODEL_PURCHASED'
  | 'MODEL_PURCHASE_REQUEST'
  | 'MODEL_ACCESS_GRANTED'
  | 'MODEL_PURCHASE_DECLINED'
  | 'MODEL_SHARED'
  | 'MESSAGE_RECEIVED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_ENABLED'
  | 'SYSTEM';

export const ADVERT_TYPES: AdvertType[] = ['PRINT_REQUEST', 'MODEL_REQUEST', 'MODEL_FOR_SALE', 'PRINT_FOR_SALE'];
export const SELECTABLE_ROLES: Role[] = ['CUSTOMER', 'PRINTER', 'MODELLER'];
export const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER', 'RATHER_NOT_SAY'];
export const LICENSES: ModelLicense[] = ['CC0', 'CC_BY', 'CC_BY_NC', 'CC_BY_SA', 'COMMERCIAL', 'ALL_RIGHTS_RESERVED'];
export const CATEGORIES: Category[] = [
  'HOME_LIVING',
  'HOMELAB_IT',
  'ELECTRONICS_CASES',
  'TOOLS_WORKSHOP',
  'SPARE_PARTS_REPAIR',
  'AUTOMOTIVE',
  'RC_DRONES',
  'TOYS_GAMES',
  'TABLETOP_MINIATURES',
  'COSPLAY_PROPS',
  'ART_DECOR',
  'JEWELRY_FASHION',
  'KITCHEN_DINING',
  'GARDEN_OUTDOOR',
  'SPORTS_OUTDOOR',
  'PETS',
  'EDUCATION_SCIENCE',
  'MEDICAL_ASSISTIVE',
  'OTHER',
];
export const VISIBILITIES: ModelVisibility[] = ['PUBLIC', 'UNLISTED', 'PRIVATE'];

export interface UserProfile {
  id: string;
  email?: string | null;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  gender?: Gender | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  city?: string | null;
  locale?: string | null;
  roles: Role[];
  mutedNotifications: NotificationType[];
  enabled: boolean;
  totpEnabled: boolean;
  emailMfaEnabled?: boolean;
  passkeyCount: number;
  createdAt?: string | null;
  hasPassword?: boolean;
}

export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Role[];
  city: string | null;
  bio?: string | null;
  memberSince?: string | null;
  blocked?: boolean;
}

export interface AuthResponse {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number | null;
  tokenType?: string;
  user?: UserProfile | null;
  mfaRequired?: boolean;
  mfaToken?: string | null;
  mfaMethods?: ('totp' | 'email' | 'TOTP' | 'EMAIL')[] | null;
  maskedEmail?: string | null;
}

export interface AuthConfigResponse {
  googleClientId: string | null;
  googleEnabled: boolean;
}

export interface TotpSetupResponse {
  secret: string;
  otpauthUri: string;
}

export interface Passkey {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface Tag {
  id: string;
  slug: string;
  label: string;
  labels: Record<string, string>;
  isDefault: boolean;
  usageCount: number;
}

export interface AdvertSummary {
  id: string;
  type: AdvertType;
  category: Category;
  title: string;
  excerpt: string;
  status: AdvertStatus;
  priceCents: number | null;
  currency: string;
  allowBidding: boolean;
  highestBidCents: number | null;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  city: string | null;
  deadline: string | null;
  viewCount: number;
  reactionCount: number;
  bidCount: number;
  coverImageUrl: string | null;
  tags: Tag[];
  author: PublicUser;
  createdAt: string;
}

export interface Reaction {
  id: string;
  body: string;
  isApplication: boolean;
  author: PublicUser;
  createdAt: string;
  canDelete: boolean;
}

export interface Bid {
  id: string;
  amountCents: number;
  message: string | null;
  status: BidStatus;
  bidder: PublicUser;
  createdAt: string;
}

export interface AdvertDetail {
  id: string;
  type: AdvertType;
  category: Category;
  title: string;
  description: string;
  status: AdvertStatus;
  priceCents: number | null;
  currency: string;
  allowBidding: boolean;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  hiddenAfterAccept: boolean;
  city: string | null;
  postalCode: string | null;
  deadline: string | null;
  viewCount: number;
  imageUrls: string[];
  imageKeys: string[];
  tags: Tag[];
  author: PublicUser;
  acceptedBy: PublicUser | null;
  acceptedAt: string | null;
  model: ModelSummary | null;
  models?: ModelDetail[];
  /** The attached model was deleted by its owner, so the advert has no files behind it. */
  modelRemoved?: boolean;
  reactions: Reaction[];
  bids: Bid[];
  highestBidCents: number | null;
  canEdit: boolean;
  canModerate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertModelInput {
  id?: string;
  title?: string;
  description?: string;
  files: {
    objectKey: string;
    fileName: string;
    contentType?: string;
    sizeBytes: number;
  }[];
}

export interface AdvertCreateRequest {
  type: AdvertType;
  category?: Category;
  title: string;
  description: string;
  priceCents?: number | null;
  allowBidding?: boolean;
  budgetMinCents?: number | null;
  budgetMaxCents?: number | null;
  hiddenAfterAccept?: boolean;
  city?: string | null;
  postalCode?: string | null;
  deadline?: string | null;
  modelId?: string | null;
  modelIds?: string[];
  models?: AdvertModelInput[];
  tags?: string[];
  imageKeys?: string[];
}

export interface ModelSummary {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  license: ModelLicense;
  priceCents: number;
  currency: string;
  visibility: ModelVisibility;
  thumbnailUrl: string | null;
  fileCount: number;
  downloadCount: number;
  owner: PublicUser;
  hasAccess: boolean;
  createdAt: string;
}

export interface ModelFile {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  downloadUrl: string | null;
}

export type PurchaseRequestStatus = 'PENDING' | 'GRANTED' | 'DECLINED';

export interface ModelPurchaseRequest {
  id: string;
  buyer: PublicUser;
  status: PurchaseRequestStatus;
  message: string | null;
  conversationId: string | null;
  createdAt: string;
}

export interface ModelDetail {
  model: ModelSummary;
  files: ModelFile[];
  purchaseRequests: ModelPurchaseRequest[];
  myPurchaseStatus: PurchaseRequestStatus | null;
}

export interface PurchaseResponse {
  conversationId: string;
  message: string;
}

export interface ModelFileRef {
  objectKey: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface ModelCreateRequest {
  title: string;
  description?: string | null;
  license?: ModelLicense;
  priceCents?: number;
  visibility?: ModelVisibility;
  category?: Category;
  thumbnailKey?: string | null;
  files?: ModelFileRef[];
  /** Also publish it as a marketplace advert straight away. */
  listOnMarketplace?: boolean;
  city?: string | null;
  tags?: string[];
}

export interface BlockedUser {
  user: PublicUser;
  reason: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationAdvert {
  id: string;
  title: string;
  type: AdvertType;
  coverImageUrl: string | null;
}

export type ParticipantStatus = 'INVITED' | 'JOINED' | 'DECLINED';

export interface ConversationParticipantDetail {
  user: PublicUser;
  status: ParticipantStatus;
  joinedAt: string;
}

export interface Conversation {
  id: string;
  title?: string | null;
  isGroup?: boolean;
  peer: PublicUser;
  participants?: PublicUser[];
  participantDetails?: ConversationParticipantDetail[];
  myStatus?: ParticipantStatus;
  advert: ConversationAdvert | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

export type MessageKind = 'TEXT' | 'SYSTEM' | 'FILE';

export interface ChatMessage {
  id: string;
  conversationId: string;
  body: string;
  kind: MessageKind;
  senderId: string;
  mine: boolean;
  sender?: PublicUser | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileUrl?: string | null;
  createdAt: string;
}

export interface PrinterModel {
  id: string;
  brand: string;
  name: string;
  watts: number;
  standbyWatts: number;
  technology: string;
  purchasePriceCents: number;
  expectedLifetimeHours: number;
}

export interface CostEstimateRequest {
  printerModelId?: string | null;
  wattsOverride?: number | null;
  printHours: number;
  printMinutes?: number;
  filamentPricePerKgCents: number;
  productWeightGrams: number;
  wasteGrams?: number;
  electricityPricePerKwhCents?: number;
  failureRatePercent?: number;
  labourMinutes?: number;
  labourRatePerHourCents?: number;
  marginPercent?: number;
  includeMachineDepreciation?: boolean;
  includeVat?: boolean;
  vatPercent?: number;
}

export interface CostLine {
  key: string;
  amountCents: number;
}

export interface CostEstimateResponse {
  printerLabel: string | null;
  watts: number;
  totalHours: number;
  energyKwh: number;
  filamentGrams: number;
  lines: CostLine[];
  subtotalCents: number;
  marginCents: number;
  vatCents: number;
  totalCents: number;
  suggestedPriceCents: number;
  currency: string;
}

export interface DayCount {
  day: string;
  count: number;
}

export interface AdminMetrics {
  totalUsers: number;
  newUsers7d: number;
  activeUsers: number;
  disabledUsers: number;
  totalAdverts: number;
  newAdverts7d: number;
  openAdverts: number;
  acceptedAdverts: number;
  totalModels: number;
  totalViews: number;
  openReports: number;
  advertsByType: Record<string, number>;
  signupsPerDay: DayCount[];
  advertsPerDay: DayCount[];
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  enabled: boolean;
  disabledReason: string | null;
  totpEnabled: boolean;
  emailMfaEnabled?: boolean;
  advertCount: number;
  lastLoginAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface AdminAdvert {
  id: string;
  title: string;
  type: AdvertType;
  status: AdvertStatus;
  author: string;
  authorId: string;
  viewCount: number;
  createdAt: string;
  deletedAt: string | null;
  deletedReason: string | null;
}

export interface AuditLogEntry {
  id: string;
  actor: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  advertId: string | null;
  userId: string | null;
  reporter: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}

export interface UploadResponse {
  objectKey: string;
  url: string;
  fileName: string;
  sizeBytes: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MessageResponse {
  message: string;
}

export interface PublicStats {
  adverts: number;
  users: number;
  models: number;
  views: number;
}

export type AdvertSort =
  | 'newest'
  | 'oldest'
  | 'views'
  | 'popular'
  | 'price_asc'
  | 'price_desc'
  | 'deadline';

export interface AdvertSearchParams {
  q?: string;
  type?: AdvertType[];
  category?: Category[];
  tag?: string[];
  status?: AdvertStatus[];
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  authorId?: string;
  postedAfter?: string;
  postedBefore?: string;
  biddable?: boolean;
  sort?: AdvertSort;
  page?: number;
  size?: number;
}

export interface AdvertList {
  id: string;
  name: string;
  isDefault: boolean;
  advertIds: string[];
  createdAt: string;
}

export type AnnouncementType = 'INFO' | 'EVENT' | 'UPDATE' | 'WARNING';

export type BannerMediaType = 'IMAGE' | 'VIDEO';

export interface PlatformBannerMedia {
  id?: string | null;
  mediaType: BannerMediaType;
  mediaUrl: string;
  mediaKey?: string | null;
  durationSeconds: number;
  sortOrder: number;
}

export interface PlatformBannerMediaUpdateRequest {
  id?: string | null;
  mediaType: BannerMediaType;
  mediaUrl: string;
  mediaKey?: string | null;
  durationSeconds: number;
  sortOrder: number;
}

export interface PlatformBanner {
  enabled: boolean;
  title: string;
  subtitle: string | null;
  badgeText: string | null;
  buttonText: string | null;
  linkUrl: string | null;
  imageUrl: string | null;
  imageKey: string | null;
  media: PlatformBannerMedia[];
  updatedAt: string;
}

export interface PlatformBannerUpdateRequest {
  enabled?: boolean;
  title: string;
  subtitle?: string | null;
  badgeText?: string | null;
  buttonText?: string | null;
  linkUrl?: string | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  media?: PlatformBannerMediaUpdateRequest[] | null;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  eventDate: string | null;
  linkUrl: string | null;
  linkText: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAnnouncementRequest {
  title: string;
  content: string;
  type?: AnnouncementType;
  eventDate?: string | null;
  linkUrl?: string | null;
  linkText?: string | null;
  active?: boolean;
}

export interface MaintenanceStatus {
  enabled: boolean;
  title: string;
  message: string;
  until: string | null;
  updatedAt: string;
}

export interface MaintenanceUpdateRequest {
  enabled: boolean;
  title?: string | null;
  message?: string | null;
  until?: string | null;
}


