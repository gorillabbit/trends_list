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