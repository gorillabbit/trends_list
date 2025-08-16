export interface Preset {
  id: string
  title: string
  packages: string[]
  npmtrends_url: string
  owner_id: string
  likes_count: number
  created_at: string
  owner_name?: string
  owner_avatar?: string
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
}

export interface PackagePresetsResponse {
  presets: Preset[]
  package: string
  page: number
  hasMore: boolean
  error?: string
}