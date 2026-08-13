export interface UserProfile {
  id: string
  email: string
  name: string
  firstName: string | null
  lastName: string | null
  avatar: string | null
  hasClientProfile: boolean
  hasContractorProfile: boolean
  clientProfileId: string | null
  contractorProfileId: string | null
}

export interface AccountProfile {
  id: string
  email: string
  name: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  avatar: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  country: string | null
  zipCode: string | null
  createdAt: string
  updatedAt: string
  clientProfile: { id: string } | null
  contractorProfile: { id: string } | null
}

export type ActiveMode = 'CLIENT' | 'CONTRACTOR'

export interface HealthResponse {
  status: 'ok'
  timestamp: string
  environment: string
  version: string | undefined
}

export interface AuthResponse {
  token: string
}

export interface TradeCategory {
  id: string
  name: string
  description: string
  icon: string
  createdAt: string
}

export type FileCategory =
  | 'JOB_PHOTO'
  | 'JOB_VIDEO'
  | 'JOB_DOCUMENT'
  | 'QUOTE_PHOTO'
  | 'QUOTE_DOCUMENT'
  | 'PROFILE_PHOTO'
  | 'PROFILE_DOCUMENT'

export interface FileUploadRecord {
  id: string
  url: string
  filename: string
  mimeType: string
  size: number
  category: FileCategory
  createdAt: string
}

export interface QuoteTier {
  id: string
  quoteId: string
  name: string
  price: number
  description: string
  duration: string
  inclusions: string[]
  exclusions: string[]
  warranty?: string | null
  createdAt: string
}

export interface QuoteQuestion {
  id: string
  quoteId: string
  question: string
  answer?: string | null
  createdAt: string
}

export interface JobQuote {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  coverLetter: string
  jobId: string
  contractorId: string
  createdAt: string
  updatedAt: string
  contractor?: {
    id: string
    slug?: string | null
    isVerified?: boolean
    averageRating?: number
    totalReviews?: number
    totalJobs?: number
    user: { name: string }
    trades?: { id: string; name: string; icon: string }[]
  }
  tiers: QuoteTier[]
  questions: QuoteQuestion[]
  files?: FileUploadRecord[]
}

export type JobStatus = 'OPEN' | 'IN_REVIEW' | 'AWARDED' | 'COMPLETED' | 'CANCELLED'

export interface Job {
  id: string
  title: string
  description: string
  address: string
  city: string
  state: string
  status: JobStatus
  clientId: string
  categoryId: string
  category: TradeCategory
  createdAt: string
  completedAt?: string | null
  clientMarkedComplete?: boolean
  contractorMarkedComplete?: boolean
  _count?: { quotes: number }
  quotes?: JobQuote[]
  files?: FileUploadRecord[]
  client?: { user: { name: string } }
  review?: Review | null
}

export interface JobSummary {
  title: string
  description: string
  scopeOfWork: string[]
  propertyDetails: {
    type: string
    size?: string
    age?: string
    floors?: string
  }
  timeline: string
  siteConditions: string[]
  preferences: string[]
  budget: string
  specialRequirements: string[]
  estimatedComplexity: 'simple' | 'moderate' | 'complex'
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  messageType: 'TEXT' | 'FILE' | 'SYSTEM'
  fileId?: string | null
  file?: FileUploadRecord | null
  readAt?: string | null
  createdAt: string
}

export interface Conversation {
  id: string
  jobId: string
  clientId: string
  contractorId: string
  lastMessageAt: string
  createdAt: string
  job: { id: string; title: string; category: { icon: string; name: string } }
  client: { user: { id: string; name: string } }
  contractor: { user: { id: string; name: string } }
  lastMessage: Message | null
  unreadCount: number
}

export type NotificationType =
  | 'NEW_QUOTE'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_REJECTED'
  | 'NEW_MESSAGE'
  | 'JOB_AWARDED'
  | 'JOB_COMPLETED'
  | 'QUESTION_ANSWERED'
  | 'NEW_JOB_IN_AREA'
  | 'NEW_REVIEW'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string | null
  readAt?: string | null
  createdAt: string
}

export type WsEventType =
  | 'CONNECTED'
  | 'NEW_MESSAGE'
  | 'NEW_NOTIFICATION'
  | 'QUOTE_SUBMITTED'
  | 'JOB_STATUS_CHANGED'

export interface ContractorProfileData {
  id: string
  userId: string
  slug: string | null
  state: string
  bio: string | null
  headline: string | null
  yearsExperience: number | null
  website: string | null
  phone: string | null
  isVerified: boolean
  averageRating: number
  totalReviews: number
  totalJobs: number
  createdAt: string
  trades: Pick<TradeCategory, 'id' | 'name' | 'icon'>[]
  profileFiles?: FileUploadRecord[]
}

export interface RatingBreakdown {
  quality: number
  communication: number
  timeliness: number
  value: number
}

export interface Review {
  id: string
  jobId: string
  authorId: string
  contractorId: string
  rating: number
  title: string
  body: string
  qualityRating: number
  communicationRating: number
  timelinessRating: number
  valueRating: number
  contractorReply: string | null
  contractorRepliedAt: string | null
  isVerified: boolean
  createdAt: string
  author?: { name: string }
  job?: { title: string }
}

export interface ContractorPublicProfile {
  id: string
  slug: string
  userId: string
  state: string
  bio: string | null
  headline: string | null
  yearsExperience: number | null
  website: string | null
  phone: string | null
  isVerified: boolean
  averageRating: number
  totalReviews: number
  totalJobs: number
  isFeatured: boolean
  memberSince: string
  createdAt: string
  trades: Pick<TradeCategory, 'id' | 'name' | 'icon'>[]
  profileFiles: FileUploadRecord[]
  reviews: Review[]
  user: { name: string }
  ratingBreakdown: RatingBreakdown
}
