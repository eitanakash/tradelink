export interface UserProfile {
  id: string
  email: string
  name: string
  hasClientProfile: boolean
  hasContractorProfile: boolean
  clientProfileId: string | null
  contractorProfileId: string | null
}

export type ActiveMode = 'CLIENT' | 'CONTRACTOR'

export interface HealthResponse {
  status: 'ok'
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

export interface JobQuote {
  id: string
  amount: number
  notes: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  jobId: string
  contractorId: string
  createdAt: string
  contractor?: { user: { name: string } }
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
  _count?: { quotes: number }
  quotes?: JobQuote[]
  client?: { user: { name: string } }
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
  specialRequirements: string[]
  estimatedComplexity: 'simple' | 'moderate' | 'complex'
}

export interface ContractorProfileData {
  id: string
  userId: string
  state: string
  bio: string | null
  isVerified: boolean
  createdAt: string
  trades: Pick<TradeCategory, 'id' | 'name' | 'icon'>[]
}
