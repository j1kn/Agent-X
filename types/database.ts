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
          default_model: string | null
          training_instructions: string | null
          autopilot_enabled: boolean | null
          gemini_api_key: string | null
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
          default_model?: string | null
          training_instructions?: string | null
          autopilot_enabled?: boolean | null
          gemini_api_key?: string | null
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
          default_model?: string | null
          training_instructions?: string | null
          autopilot_enabled?: boolean | null
          gemini_api_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'connected_accounts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
          topic: string | null
          image_url: string | null
          image_data: string | null
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
          topic?: string | null
          image_url?: string | null
          image_data?: string | null
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
          topic?: string | null
          image_url?: string | null
          image_data?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'posts_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'connected_accounts'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: 'post_metrics_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: 'pipeline_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: 'oauth_pkce_storage_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: 'learning_data_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'learning_data_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'connected_accounts'
            referencedColumns: ['id']
          }
        ]
      }
      schedule_config: {
        Row: {
          id: string
          user_id: string
          days_of_week: string[] | null
          times: string[] | null
          frequency: 'daily' | 'weekly' | 'monthly' | null
          timezone: string | null
          image_generation_enabled: boolean | null
          image_times: string[] | null
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
          image_generation_enabled?: boolean | null
          image_times?: string[] | null
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
          image_generation_enabled?: boolean | null
          image_times?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_config_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: 'workflow_runs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
