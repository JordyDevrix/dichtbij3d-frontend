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
export type NotificationType =
  | 'ADVERT_REACTION'
  | 'ADVERT_ACCEPTED'
  | 'ADVERT_REMOVED'
  | 'BID_PLACED'
  | 'BID_ACCEPTED'
  | 'BID_REJECTED'
  | 'MODEL_PURCHASED'
  | 'MODEL_SHARED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_ENABLED'
  | 'SYSTEM';

export const ADVERT_TYPES: AdvertType[] = ['PRINT_REQUEST', 'MODEL_REQUEST', 'MODEL_FOR_SALE', 'PRINT_FOR_SALE'];
export const SELECTABLE_ROLES: Role[] = ['CUSTOMER', 'PRINTER', 'MODELLER'];
export const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER', 'RATHER_NOT_SAY'];
export const LICENSES: ModelLicense[] = ['CC0', 'CC_BY', 'CC_BY_NC', 'CC_BY_SA', 'COMMERCIAL', 'ALL_RIGHTS_RESERVED'];
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
  enabled: boolean;
  totpEnabled: boolean;
  passkeyCount: number;
  createdAt?: string | null;
}

export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Role[];
  city: string | null;
  bio?: string | null;
  memberSince?: string | null;
}

export interface AuthResponse {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number | null;
  tokenType?: string;
  user?: UserProfile | null;
  mfaRequired?: boolean;
  mfaToken?: string | null;
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
  tags: Tag[];
  author: PublicUser;
  acceptedBy: PublicUser | null;
  acceptedAt: string | null;
  model: ModelSummary | null;
  reactions: Reaction[];
  bids: Bid[];
  highestBidCents: number | null;
  canEdit: boolean;
  canModerate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertCreateRequest {
  type: AdvertType;
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
  tags?: string[];
  imageKeys?: string[];
}

export interface ModelSummary {
  id: string;
  title: string;
  description: string | null;
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

export interface ModelDetail {
  model: ModelSummary;
  files: ModelFile[];
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
  thumbnailKey?: string | null;
  files?: ModelFileRef[];
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
