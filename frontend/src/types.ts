export interface Preset {
  id: string
  title: string
  packages: string[]
  owner_id: string
  likes_count: number
  liked?: boolean
  created_at: string
}

export interface Tag {
  id: string
  name: string
  description?: string
  color: string
  created_at: string
}

export interface Package {
  id: string
  name: string
  description?: string
  weekly_downloads: number
  repository?: string
  homepage?: string
  last_update: string
  created_at: string
  tags?: Tag[]
}

export interface PackagePresetsResponse {
  presets: Preset[]
  package: string
  page: number
  hasMore: boolean
  error?: string
}