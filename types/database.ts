export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          ai_provider: 'gemini' | 'openai' | 'anthropic' | null
          ai_api_key: string | null
          topics: string[]
          tone: string | null
          posting_frequency: 'daily' | 'twice_daily' | 'weekly' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          ai_provider?: 'gemini' | 'openai' | 'anthropic' | null
          ai_api_key?: string | null
          topics?: string[]
          tone?: string | null
          posting_frequency?: 'daily' | 'twice_daily' | 'weekly' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ai_provider?: 'gemini' | 'openai' | 'anthropic' | null
          ai_api_key?: string | null
          topics?: string[]
          tone?: string | null
          posting_frequency?: 'daily' | 'twice_daily' | 'weekly' | null
          created_at?: string
          updated_at?: string
        }
      }
      connected_accounts: {
        Row: {
          id: string
          user_id: string
          platform: 'telegram' | 'x' | 'linkedin'
          platform_user_id: string
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          username: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: 'telegram' | 'x' | 'linkedin'
          platform_user_id: string
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          username: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: 'telegram' | 'x' | 'linkedin'
          platform_user_id?: string
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          username?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          account_id: string
          status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
          content: string
          platform: 'telegram' | 'x' | 'linkedin'
          scheduled_for: string | null
          published_at: string | null
          platform_post_id: string | null
          generation_prompt: string | null
          generation_model: string | null
          generation_metadata: Json
          post_format: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
          content: string
          platform: 'telegram' | 'x' | 'linkedin'
          scheduled_for?: string | null
          published_at?: string | null
          platform_post_id?: string | null
          generation_prompt?: string | null
          generation_model?: string | null
          generation_metadata?: Json
          post_format?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
          content?: string
          platform?: 'telegram' | 'x' | 'linkedin'
          scheduled_for?: string | null
          published_at?: string | null
          platform_post_id?: string | null
          generation_prompt?: string | null
          generation_model?: string | null
          generation_metadata?: Json
          post_format?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      post_metrics: {
        Row: {
          id: string
          post_id: string
          platform_post_id: string
          likes: number
          retweets: number
          views: number
          collected_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          platform_post_id: string
          likes?: number
          retweets?: number
          views?: number
          collected_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          platform_post_id?: string
          likes?: number
          retweets?: number
          views?: number
          collected_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      pipeline_logs: {
        Row: {
          id: string
          user_id: string
          step: 'planning' | 'generation' | 'scheduling' | 'publishing' | 'metrics' | 'learning'
          status: 'success' | 'error' | 'warning'
          message: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          step: 'planning' | 'generation' | 'scheduling' | 'publishing' | 'metrics' | 'learning'
          status: 'success' | 'error' | 'warning'
          message: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          step?: 'planning' | 'generation' | 'scheduling' | 'publishing' | 'metrics' | 'learning'
          status?: 'success' | 'error' | 'warning'
          message?: string
          metadata?: Json
          created_at?: string
        }
      }
      oauth_pkce_storage: {
        Row: {
          id: string
          state: string
          code_verifier: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          state: string
          code_verifier: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          state?: string
          code_verifier?: string
          user_id?: string
          created_at?: string
        }
      }
      learning_data: {
        Row: {
          id: string
          user_id: string
          account_id: string
          best_time_of_day: string | null
          best_day_of_week: string | null
          best_format: string | null
          avg_engagement: number
          sample_size: number
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          best_time_of_day?: string | null
          best_day_of_week?: string | null
          best_format?: string | null
          avg_engagement?: number
          sample_size?: number
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          best_time_of_day?: string | null
          best_day_of_week?: string | null
          best_format?: string | null
          avg_engagement?: number
          sample_size?: number
          last_updated?: string
        }
      }
      schedule_config: {
        Row: {
          id: string
          user_id: string
          days_of_week: string[] | null
          times: string[] | null
          frequency: 'daily' | 'weekly' | 'monthly' | null
          timezone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          days_of_week?: string[] | null
          times?: string[] | null
          frequency?: 'daily' | 'weekly' | 'monthly' | null
          timezone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          days_of_week?: string[] | null
          times?: string[] | null
          frequency?: 'daily' | 'weekly' | 'monthly' | null
          timezone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflow_runs: {
        Row: {
          id: string
          user_id: string
          time_slot: string
          status: 'completed' | 'failed'
          platforms_published: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          time_slot: string
          status: 'completed' | 'failed'
          platforms_published?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          time_slot?: string
          status?: 'completed' | 'failed'
          platforms_published?: string[]
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

