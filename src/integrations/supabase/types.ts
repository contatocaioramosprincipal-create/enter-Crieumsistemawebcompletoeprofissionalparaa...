export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  _analytics: {
    Tables: {
      alert_queries: {
        Row: {
          cron: string | null
          description: string | null
          id: number
          inserted_at: string
          language: string | null
          name: string | null
          query: string | null
          slack_hook_url: string | null
          source_mapping: Json | null
          token: string | null
          updated_at: string
          user_id: number | null
          webhook_notification_url: string | null
        }
        Insert: {
          cron?: string | null
          description?: string | null
          id?: number
          inserted_at: string
          language?: string | null
          name?: string | null
          query?: string | null
          slack_hook_url?: string | null
          source_mapping?: Json | null
          token?: string | null
          updated_at: string
          user_id?: number | null
          webhook_notification_url?: string | null
        }
        Update: {
          cron?: string | null
          description?: string | null
          id?: number
          inserted_at?: string
          language?: string | null
          name?: string | null
          query?: string | null
          slack_hook_url?: string | null
          source_mapping?: Json | null
          token?: string | null
          updated_at?: string
          user_id?: number | null
          webhook_notification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_queries_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_queries_backends: {
        Row: {
          alert_query_id: number | null
          backend_id: number | null
          id: number
        }
        Insert: {
          alert_query_id?: number | null
          backend_id?: number | null
          id?: number
        }
        Update: {
          alert_query_id?: number | null
          backend_id?: number | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "alert_queries_backends_alert_query_id_fkey"
            columns: ["alert_query_id"]
            referencedRelation: "alert_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_queries_backends_backend_id_fkey"
            columns: ["backend_id"]
            referencedRelation: "backends"
            referencedColumns: ["id"]
          },
        ]
      }
      backends: {
        Row: {
          config: Json | null
          config_encrypted: string | null
          default_ingest: boolean | null
          description: string | null
          id: number
          inserted_at: string
          metadata: Json | null
          name: string | null
          token: string
          type: string | null
          updated_at: string
          user_id: number | null
        }
        Insert: {
          config?: Json | null
          config_encrypted?: string | null
          default_ingest?: boolean | null
          description?: string | null
          id?: number
          inserted_at: string
          metadata?: Json | null
          name?: string | null
          token: string
          type?: string | null
          updated_at: string
          user_id?: number | null
        }
        Update: {
          config?: Json | null
          config_encrypted?: string | null
          default_ingest?: boolean | null
          description?: string | null
          id?: number
          inserted_at?: string
          metadata?: Json | null
          name?: string | null
          token?: string
          type?: string | null
          updated_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "backends_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_accounts: {
        Row: {
          custom_invoice_fields: Json[] | null
          default_payment_method: string | null
          id: number
          inserted_at: string
          latest_successful_stripe_session: Json | null
          lifetime_plan: boolean
          lifetime_plan_invoice: string | null
          "lifetime_plan?": boolean | null
          stripe_customer: string | null
          stripe_invoices: Json | null
          stripe_subscriptions: Json | null
          updated_at: string
          user_id: number | null
        }
        Insert: {
          custom_invoice_fields?: Json[] | null
          default_payment_method?: string | null
          id?: number
          inserted_at: string
          latest_successful_stripe_session?: Json | null
          lifetime_plan?: boolean
          lifetime_plan_invoice?: string | null
          "lifetime_plan?"?: boolean | null
          stripe_customer?: string | null
          stripe_invoices?: Json | null
          stripe_subscriptions?: Json | null
          updated_at: string
          user_id?: number | null
        }
        Update: {
          custom_invoice_fields?: Json[] | null
          default_payment_method?: string | null
          id?: number
          inserted_at?: string
          latest_successful_stripe_session?: Json | null
          lifetime_plan?: boolean
          lifetime_plan_invoice?: string | null
          "lifetime_plan?"?: boolean | null
          stripe_customer?: string | null
          stripe_invoices?: Json | null
          stripe_subscriptions?: Json | null
          updated_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_counts: {
        Row: {
          count: number | null
          id: number
          inserted_at: string
          node: string | null
          source_id: number | null
          updated_at: string
          user_id: number | null
        }
        Insert: {
          count?: number | null
          id?: number
          inserted_at: string
          node?: string | null
          source_id?: number | null
          updated_at: string
          user_id?: number | null
        }
        Update: {
          count?: number | null
          id?: number
          inserted_at?: string
          node?: string | null
          source_id?: number | null
          updated_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_counts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      endpoint_queries: {
        Row: {
          backend_id: number | null
          cache_duration_seconds: number | null
          description: string | null
          enable_auth: boolean | null
          id: number
          inserted_at: string
          labels: string | null
          language: string
          max_limit: number | null
          name: string | null
          proactive_requerying_seconds: number | null
          query: string | null
          redact_pii: boolean
          sandbox_query_id: number | null
          sandboxable: boolean | null
          source_mapping: Json
          token: string | null
          updated_at: string
          user_id: number | null
        }
        Insert: {
          backend_id?: number | null
          cache_duration_seconds?: number | null
          description?: string | null
          enable_auth?: boolean | null
          id?: number
          inserted_at: string
          labels?: string | null
          language: string
          max_limit?: number | null
          name?: string | null
          proactive_requerying_seconds?: number | null
          query?: string | null
          redact_pii?: boolean
          sandbox_query_id?: number | null
          sandboxable?: boolean | null
          source_mapping?: Json
          token?: string | null
          updated_at: string
          user_id?: number | null
        }
        Update: {
          backend_id?: number | null
          cache_duration_seconds?: number | null
          description?: string | null
          enable_auth?: boolean | null
          id?: number
          inserted_at?: string
          labels?: string | null
          language?: string
          max_limit?: number | null
          name?: string | null
          proactive_requerying_seconds?: number | null
          query?: string | null
          redact_pii?: boolean
          sandbox_query_id?: number | null
          sandboxable?: boolean | null
          source_mapping?: Json
          token?: string | null
          updated_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "endpoint_queries_backend_id_fkey"
            columns: ["backend_id"]
            referencedRelation: "backends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoint_queries_sandbox_query_id_fkey"
            columns: ["sandbox_query_id"]
            referencedRelation: "endpoint_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoint_queries_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      log_events_0f3a5944_2e99_489c_a35a_556183e46654: {
        Row: {
          body: Json | null
          event_message: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          body?: Json | null
          event_message?: string | null
          id: string
          timestamp?: string | null
        }
        Update: {
          body?: Json | null
          event_message?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      log_events_3b788591_84e6_4766_8fe3_104a9dc2cf0f: {
        Row: {
          body: Json | null
          event_message: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          body?: Json | null
          event_message?: string | null
          id: string
          timestamp?: string | null
        }
        Update: {
          body?: Json | null
          event_message?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      log_events_7b636cb1_2bc9_4720_9966_f06bac1507b7: {
        Row: {
          body: Json | null
          event_message: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          body?: Json | null
          event_message?: string | null
          id: string
          timestamp?: string | null
        }
        Update: {
          body?: Json | null
          event_message?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      log_events_82b8a70d_37db_46f2_b034_feb85c2e76f5: {
        Row: {
          body: Json | null
          event_message: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          body?: Json | null
          event_message?: string | null
          id: string
          timestamp?: string | null
        }
        Update: {
          body?: Json | null
          event_message?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      log_events_89b28278_9317_4f49_a291_aa3f2da27bac: {
        Row: {
          body: Json | null
          event_message: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          body?: Json | null
          event_message?: string | null
          id: string
          timestamp?: string | null
        }
        Update: {
          body?: Json | null
          event_message?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      log_events_937cc6aa_2e50_4db4_a436_8e8a8a046794: {
        Row: {
          body: Json | null
          event_message: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          body?: Json | null
          event_message?: string | null
          id: string
          timestamp?: string | null
        }
        Update: {
          body?: Json | null
          event_message?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      log_events_b4af0b59_99d0_4488_98e0_d934515b928d: {
        Row: {
          body: Json | null
          event_message: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          body?: Json | null
          event_message?: string | null
          id: string
          timestamp?: string | null
        }
        Update: {
          body?: Json | null
          event_message?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      log_events_f8d36e86_9631_4889_962a_bfe79a8ca90b: {
        Row: {
          body: Json | null
          event_message: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          body?: Json | null
          event_message?: string | null
          id: string
          timestamp?: string | null
        }
        Update: {
          body?: Json | null
          event_message?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      log_events_fc87a284_490f_488e_b644_131536c22128: {
        Row: {
          body: Json | null
          event_message: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          body?: Json | null
          event_message?: string | null
          id: string
          timestamp?: string | null
        }
        Update: {
          body?: Json | null
          event_message?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      oauth_access_grants: {
        Row: {
          application_id: number | null
          expires_in: number
          id: number
          inserted_at: string
          redirect_uri: string
          resource_owner_id: number
          revoked_at: string | null
          scopes: string | null
          token: string
        }
        Insert: {
          application_id?: number | null
          expires_in: number
          id?: number
          inserted_at: string
          redirect_uri: string
          resource_owner_id: number
          revoked_at?: string | null
          scopes?: string | null
          token: string
        }
        Update: {
          application_id?: number | null
          expires_in?: number
          id?: number
          inserted_at?: string
          redirect_uri?: string
          resource_owner_id?: number
          revoked_at?: string | null
          scopes?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_access_grants_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "oauth_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_access_tokens: {
        Row: {
          application_id: number | null
          description: string | null
          expires_in: number | null
          id: number
          inserted_at: string
          previous_refresh_token: string
          refresh_token: string | null
          resource_owner_id: number | null
          revoked_at: string | null
          scopes: string | null
          token: string
          updated_at: string
        }
        Insert: {
          application_id?: number | null
          description?: string | null
          expires_in?: number | null
          id?: number
          inserted_at: string
          previous_refresh_token?: string
          refresh_token?: string | null
          resource_owner_id?: number | null
          revoked_at?: string | null
          scopes?: string | null
          token: string
          updated_at: string
        }
        Update: {
          application_id?: number | null
          description?: string | null
          expires_in?: number | null
          id?: number
          inserted_at?: string
          previous_refresh_token?: string
          refresh_token?: string | null
          resource_owner_id?: number | null
          revoked_at?: string | null
          scopes?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_access_tokens_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "oauth_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_applications: {
        Row: {
          id: number
          inserted_at: string
          name: string
          owner_id: number
          redirect_uri: string
          scopes: string
          secret: string
          uid: string
          updated_at: string
        }
        Insert: {
          id?: number
          inserted_at: string
          name: string
          owner_id: number
          redirect_uri: string
          scopes?: string
          secret?: string
          uid: string
          updated_at: string
        }
        Update: {
          id?: number
          inserted_at?: string
          name?: string
          owner_id?: number
          redirect_uri?: string
          scopes?: string
          secret?: string
          uid?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_users: {
        Row: {
          id: number
          partner_id: number | null
          upgraded: boolean
          user_id: number | null
        }
        Insert: {
          id?: number
          partner_id?: number | null
          upgraded?: boolean
          user_id?: number | null
        }
        Update: {
          id?: number
          partner_id?: number | null
          upgraded?: boolean
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_users_partner_id_fkey"
            columns: ["partner_id"]
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_users_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          id: number
          name: string | null
          token: string | null
        }
        Insert: {
          id?: number
          name?: string | null
          token?: string | null
        }
        Update: {
          id?: number
          name?: string | null
          token?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          customer_id: string | null
          exp_month: number | null
          exp_year: number | null
          id: number
          inserted_at: string
          last_four: string | null
          price_id: string | null
          stripe_id: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          customer_id?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: number
          inserted_at: string
          last_four?: string | null
          price_id?: string | null
          stripe_id?: string | null
          updated_at: string
        }
        Update: {
          brand?: string | null
          customer_id?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: number
          inserted_at?: string
          last_four?: string | null
          price_id?: string | null
          stripe_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "billing_accounts"
            referencedColumns: ["stripe_customer"]
          },
        ]
      }
      plans: {
        Row: {
          id: number
          inserted_at: string
          limit_alert_freq: number | null
          limit_rate_limit: number | null
          limit_saved_search_limit: number | null
          limit_source_fields_limit: number | null
          limit_source_rate_limit: number | null
          limit_source_ttl: number | null
          limit_sources: number | null
          limit_team_users_limit: number | null
          name: string | null
          period: string | null
          price: number | null
          stripe_id: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          inserted_at: string
          limit_alert_freq?: number | null
          limit_rate_limit?: number | null
          limit_saved_search_limit?: number | null
          limit_source_fields_limit?: number | null
          limit_source_rate_limit?: number | null
          limit_source_ttl?: number | null
          limit_sources?: number | null
          limit_team_users_limit?: number | null
          name?: string | null
          period?: string | null
          price?: number | null
          stripe_id?: string | null
          type?: string | null
          updated_at: string
        }
        Update: {
          id?: number
          inserted_at?: string
          limit_alert_freq?: number | null
          limit_rate_limit?: number | null
          limit_saved_search_limit?: number | null
          limit_source_fields_limit?: number | null
          limit_source_rate_limit?: number | null
          limit_source_ttl?: number | null
          limit_sources?: number | null
          limit_team_users_limit?: number | null
          name?: string | null
          period?: string | null
          price?: number | null
          stripe_id?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rules: {
        Row: {
          backend_id: number | null
          id: number
          inserted_at: string
          lql_filters: string
          lql_string: string
          regex: string | null
          regex_struct: string | null
          sink: string | null
          source_id: number
          token: string | null
          updated_at: string
        }
        Insert: {
          backend_id?: number | null
          id?: number
          inserted_at: string
          lql_filters?: string
          lql_string?: string
          regex?: string | null
          regex_struct?: string | null
          sink?: string | null
          source_id: number
          token?: string | null
          updated_at: string
        }
        Update: {
          backend_id?: number | null
          id?: number
          inserted_at?: string
          lql_filters?: string
          lql_string?: string
          regex?: string | null
          regex_struct?: string | null
          sink?: string | null
          source_id?: number
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_backend_id_fkey"
            columns: ["backend_id"]
            referencedRelation: "backends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_sink_fkey"
            columns: ["sink"]
            referencedRelation: "sources"
            referencedColumns: ["token"]
          },
          {
            foreignKeyName: "rules_source_id_fkey"
            columns: ["source_id"]
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_search_counters: {
        Row: {
          granularity: string
          id: number
          non_tailing_count: number | null
          saved_search_id: number
          tailing_count: number | null
          timestamp: string
        }
        Insert: {
          granularity?: string
          id?: number
          non_tailing_count?: number | null
          saved_search_id: number
          tailing_count?: number | null
          timestamp: string
        }
        Update: {
          granularity?: string
          id?: number
          non_tailing_count?: number | null
          saved_search_id?: number
          tailing_count?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_search_counters_saved_search_id_fkey"
            columns: ["saved_search_id"]
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          id: number
          inserted_at: string
          lql_charts: Json | null
          lql_filters: Json | null
          querystring: string | null
          saved_by_user: boolean | null
          source_id: number | null
          tailing: boolean
          "tailing?": boolean
          updated_at: string
        }
        Insert: {
          id?: number
          inserted_at: string
          lql_charts?: Json | null
          lql_filters?: Json | null
          querystring?: string | null
          saved_by_user?: boolean | null
          source_id?: number | null
          tailing?: boolean
          "tailing?"?: boolean
          updated_at: string
        }
        Update: {
          id?: number
          inserted_at?: string
          lql_charts?: Json | null
          lql_filters?: Json | null
          querystring?: string | null
          saved_by_user?: boolean | null
          source_id?: number | null
          tailing?: boolean
          "tailing?"?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_source_id_fkey"
            columns: ["source_id"]
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          inserted_at: string | null
          version: number
        }
        Insert: {
          inserted_at?: string | null
          version: number
        }
        Update: {
          inserted_at?: string | null
          version?: number
        }
        Relationships: []
      }
      source_backends: {
        Row: {
          config: Json | null
          id: number
          inserted_at: string
          source_id: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          id?: number
          inserted_at: string
          source_id?: number | null
          type?: string | null
          updated_at: string
        }
        Update: {
          config?: Json | null
          id?: number
          inserted_at?: string
          source_id?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_backends_source_id_fkey"
            columns: ["source_id"]
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_schemas: {
        Row: {
          bigquery_schema: string | null
          id: number
          inserted_at: string
          schema_flat_map: string | null
          source_id: number | null
          updated_at: string
        }
        Insert: {
          bigquery_schema?: string | null
          id?: number
          inserted_at: string
          schema_flat_map?: string | null
          source_id?: number | null
          updated_at: string
        }
        Update: {
          bigquery_schema?: string | null
          id?: number
          inserted_at?: string
          schema_flat_map?: string | null
          source_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_schemas_source_id_fkey"
            columns: ["source_id"]
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          api_quota: number
          bigquery_clustering_fields: string | null
          bigquery_schema: string | null
          bigquery_table_ttl: number | null
          bq_storage_write_api: boolean | null
          bq_table_partition_type: string | null
          custom_event_message_keys: string | null
          default_ingest_backend_enabled: boolean | null
          disable_tailing: boolean | null
          drop_lql_filters: string
          drop_lql_string: string | null
          favorite: boolean
          id: number
          inserted_at: string
          lock_schema: boolean | null
          log_events_updated_at: string | null
          name: string | null
          notifications: Json
          notifications_every: number | null
          public_token: string | null
          service_name: string | null
          slack_hook_url: string | null
          suggested_keys: string | null
          token: string
          transform_copy_fields: string | null
          updated_at: string
          user_id: number
          v2_pipeline: boolean | null
          validate_schema: boolean | null
          webhook_notification_url: string | null
        }
        Insert: {
          api_quota?: number
          bigquery_clustering_fields?: string | null
          bigquery_schema?: string | null
          bigquery_table_ttl?: number | null
          bq_storage_write_api?: boolean | null
          bq_table_partition_type?: string | null
          custom_event_message_keys?: string | null
          default_ingest_backend_enabled?: boolean | null
          disable_tailing?: boolean | null
          drop_lql_filters?: string
          drop_lql_string?: string | null
          favorite?: boolean
          id?: number
          inserted_at: string
          lock_schema?: boolean | null
          log_events_updated_at?: string | null
          name?: string | null
          notifications?: Json
          notifications_every?: number | null
          public_token?: string | null
          service_name?: string | null
          slack_hook_url?: string | null
          suggested_keys?: string | null
          token: string
          transform_copy_fields?: string | null
          updated_at: string
          user_id: number
          v2_pipeline?: boolean | null
          validate_schema?: boolean | null
          webhook_notification_url?: string | null
        }
        Update: {
          api_quota?: number
          bigquery_clustering_fields?: string | null
          bigquery_schema?: string | null
          bigquery_table_ttl?: number | null
          bq_storage_write_api?: boolean | null
          bq_table_partition_type?: string | null
          custom_event_message_keys?: string | null
          default_ingest_backend_enabled?: boolean | null
          disable_tailing?: boolean | null
          drop_lql_filters?: string
          drop_lql_string?: string | null
          favorite?: boolean
          id?: number
          inserted_at?: string
          lock_schema?: boolean | null
          log_events_updated_at?: string | null
          name?: string | null
          notifications?: Json
          notifications_every?: number | null
          public_token?: string | null
          service_name?: string | null
          slack_hook_url?: string | null
          suggested_keys?: string | null
          token?: string
          transform_copy_fields?: string | null
          updated_at?: string
          user_id?: number
          v2_pipeline?: boolean | null
          validate_schema?: boolean | null
          webhook_notification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sources_backends: {
        Row: {
          backend_id: number | null
          id: number
          source_id: number | null
        }
        Insert: {
          backend_id?: number | null
          id?: number
          source_id?: number | null
        }
        Update: {
          backend_id?: number | null
          id?: number
          source_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_backends_backend_id_fkey"
            columns: ["backend_id"]
            referencedRelation: "backends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_backends_source_id_fkey"
            columns: ["source_id"]
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      system_metrics: {
        Row: {
          all_logs_logged: number | null
          id: number
          inserted_at: string
          node: string | null
          updated_at: string
        }
        Insert: {
          all_logs_logged?: number | null
          id?: number
          inserted_at: string
          node?: string | null
          updated_at: string
        }
        Update: {
          all_logs_logged?: number | null
          id?: number
          inserted_at?: string
          node?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      team_users: {
        Row: {
          email: string | null
          email_me_product: boolean
          email_preferred: string | null
          id: number
          image: string | null
          inserted_at: string
          name: string | null
          phone: string | null
          preferences: Json | null
          provider: string | null
          provider_uid: string | null
          team_id: number | null
          token: string | null
          updated_at: string
          valid_google_account: boolean
        }
        Insert: {
          email?: string | null
          email_me_product?: boolean
          email_preferred?: string | null
          id?: number
          image?: string | null
          inserted_at: string
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          provider?: string | null
          provider_uid?: string | null
          team_id?: number | null
          token?: string | null
          updated_at: string
          valid_google_account?: boolean
        }
        Update: {
          email?: string | null
          email_me_product?: boolean
          email_preferred?: string | null
          id?: number
          image?: string | null
          inserted_at?: string
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          provider?: string | null
          provider_uid?: string | null
          team_id?: number | null
          token?: string | null
          updated_at?: string
          valid_google_account?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "team_users_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          id: number
          inserted_at: string
          name: string | null
          token: string | null
          updated_at: string
          user_id: number | null
        }
        Insert: {
          id?: number
          inserted_at: string
          name?: string | null
          token?: string | null
          updated_at: string
          user_id?: number | null
        }
        Update: {
          id?: number
          inserted_at?: string
          name?: string | null
          token?: string | null
          updated_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          admin: boolean
          api_key: string
          api_quota: number
          bigquery_dataset_id: string | null
          bigquery_dataset_location: string | null
          bigquery_enable_managed_service_accounts: boolean | null
          bigquery_processed_bytes_limit: number
          bigquery_project_id: string | null
          bigquery_reservation_alerts: string | null
          bigquery_reservation_search: string | null
          bigquery_udfs_hash: string
          billing_enabled: boolean
          "billing_enabled?": boolean
          company: string | null
          email: string | null
          email_me_product: boolean
          email_preferred: string | null
          endpoints_beta: boolean | null
          id: number
          image: string | null
          inserted_at: string
          metadata: Json | null
          name: string | null
          old_api_key: string | null
          partner_id: number | null
          partner_upgraded: boolean | null
          phone: string | null
          preferences: Json | null
          provider: string
          provider_uid: string
          token: string
          updated_at: string
          valid_google_account: boolean | null
        }
        Insert: {
          admin?: boolean
          api_key: string
          api_quota?: number
          bigquery_dataset_id?: string | null
          bigquery_dataset_location?: string | null
          bigquery_enable_managed_service_accounts?: boolean | null
          bigquery_processed_bytes_limit?: number
          bigquery_project_id?: string | null
          bigquery_reservation_alerts?: string | null
          bigquery_reservation_search?: string | null
          bigquery_udfs_hash?: string
          billing_enabled?: boolean
          "billing_enabled?"?: boolean
          company?: string | null
          email?: string | null
          email_me_product?: boolean
          email_preferred?: string | null
          endpoints_beta?: boolean | null
          id?: number
          image?: string | null
          inserted_at: string
          metadata?: Json | null
          name?: string | null
          old_api_key?: string | null
          partner_id?: number | null
          partner_upgraded?: boolean | null
          phone?: string | null
          preferences?: Json | null
          provider: string
          provider_uid: string
          token: string
          updated_at: string
          valid_google_account?: boolean | null
        }
        Update: {
          admin?: boolean
          api_key?: string
          api_quota?: number
          bigquery_dataset_id?: string | null
          bigquery_dataset_location?: string | null
          bigquery_enable_managed_service_accounts?: boolean | null
          bigquery_processed_bytes_limit?: number
          bigquery_project_id?: string | null
          bigquery_reservation_alerts?: string | null
          bigquery_reservation_search?: string | null
          bigquery_udfs_hash?: string
          billing_enabled?: boolean
          "billing_enabled?"?: boolean
          company?: string | null
          email?: string | null
          email_me_product?: boolean
          email_preferred?: string | null
          endpoints_beta?: boolean | null
          id?: number
          image?: string | null
          inserted_at?: string
          metadata?: Json | null
          name?: string | null
          old_api_key?: string | null
          partner_id?: number | null
          partner_upgraded?: boolean | null
          phone?: string | null
          preferences?: Json | null
          provider?: string
          provider_uid?: string
          token?: string
          updated_at?: string
          valid_google_account?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "users_partner_id_fkey"
            columns: ["partner_id"]
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      vercel_auths: {
        Row: {
          access_token: string | null
          id: number
          inserted_at: string
          installation_id: string | null
          team_id: string | null
          token_type: string | null
          updated_at: string
          user_id: number | null
          vercel_user_id: string | null
        }
        Insert: {
          access_token?: string | null
          id?: number
          inserted_at: string
          installation_id?: string | null
          team_id?: string | null
          token_type?: string | null
          updated_at: string
          user_id?: number | null
          vercel_user_id?: string | null
        }
        Update: {
          access_token?: string | null
          id?: number
          inserted_at?: string
          installation_id?: string | null
          team_id?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: number | null
          vercel_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vercel_auths_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_logs: {
        Args: { days_to_keep?: number; max_table_size_mb?: number }
        Returns: {
          deleted_rows: number
          reason: string
          table_name: string
          table_size_mb: number
        }[]
      }
      show_table_sizes: {
        Args: { max_table_size_mb?: number }
        Returns: {
          row_count: number
          size_mb: number
          status: string
          table_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  _realtime: {
    Tables: {
      extensions: {
        Row: {
          id: string
          inserted_at: string
          settings: Json | null
          tenant_external_id: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          id: string
          inserted_at: string
          settings?: Json | null
          tenant_external_id?: string | null
          type?: string | null
          updated_at: string
        }
        Update: {
          id?: string
          inserted_at?: string
          settings?: Json | null
          tenant_external_id?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extensions_tenant_external_id_fkey"
            columns: ["tenant_external_id"]
            referencedRelation: "tenants"
            referencedColumns: ["external_id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          inserted_at: string | null
          version: number
        }
        Insert: {
          inserted_at?: string | null
          version: number
        }
        Update: {
          inserted_at?: string | null
          version?: number
        }
        Relationships: []
      }
      tenants: {
        Row: {
          broadcast_adapter: string | null
          external_id: string | null
          id: string
          inserted_at: string
          jwt_jwks: Json | null
          jwt_secret: string | null
          max_bytes_per_second: number
          max_channels_per_client: number
          max_concurrent_users: number
          max_events_per_second: number
          max_joins_per_second: number
          max_payload_size_in_kb: number | null
          max_presence_events_per_second: number | null
          migrations_ran: number | null
          name: string | null
          notify_private_alpha: boolean | null
          postgres_cdc_default: string | null
          private_only: boolean
          suspend: boolean | null
          updated_at: string
        }
        Insert: {
          broadcast_adapter?: string | null
          external_id?: string | null
          id: string
          inserted_at: string
          jwt_jwks?: Json | null
          jwt_secret?: string | null
          max_bytes_per_second?: number
          max_channels_per_client?: number
          max_concurrent_users?: number
          max_events_per_second?: number
          max_joins_per_second?: number
          max_payload_size_in_kb?: number | null
          max_presence_events_per_second?: number | null
          migrations_ran?: number | null
          name?: string | null
          notify_private_alpha?: boolean | null
          postgres_cdc_default?: string | null
          private_only?: boolean
          suspend?: boolean | null
          updated_at: string
        }
        Update: {
          broadcast_adapter?: string | null
          external_id?: string | null
          id?: string
          inserted_at?: string
          jwt_jwks?: Json | null
          jwt_secret?: string | null
          max_bytes_per_second?: number
          max_channels_per_client?: number
          max_concurrent_users?: number
          max_events_per_second?: number
          max_joins_per_second?: number
          max_payload_size_in_kb?: number | null
          max_presence_events_per_second?: number | null
          migrations_ran?: number | null
          name?: string | null
          notify_private_alpha?: boolean | null
          postgres_cdc_default?: string | null
          private_only?: boolean
          suspend?: boolean | null
          updated_at?: string
        }
        Relationships: []
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
  auth: {
    Tables: {
      audit_log_entries: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string | null
          ip_address: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Relationships: []
      }
      config_settings: {
        Row: {
          created_at: string
          id: string
          is_secret: boolean
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_secret?: boolean
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_secret?: boolean
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      custom_oauth_providers: {
        Row: {
          acceptable_client_ids: string[]
          attribute_mapping: Json
          authorization_params: Json
          authorization_url: string | null
          cached_discovery: Json | null
          client_id: string
          client_secret: string
          created_at: string
          discovery_cached_at: string | null
          discovery_url: string | null
          email_optional: boolean
          enabled: boolean
          id: string
          identifier: string
          issuer: string | null
          jwks_uri: string | null
          name: string
          pkce_enabled: boolean
          provider_type: string
          scopes: string[]
          skip_nonce_check: boolean
          token_url: string | null
          updated_at: string
          userinfo_url: string | null
        }
        Insert: {
          acceptable_client_ids?: string[]
          attribute_mapping?: Json
          authorization_params?: Json
          authorization_url?: string | null
          cached_discovery?: Json | null
          client_id: string
          client_secret: string
          created_at?: string
          discovery_cached_at?: string | null
          discovery_url?: string | null
          email_optional?: boolean
          enabled?: boolean
          id?: string
          identifier: string
          issuer?: string | null
          jwks_uri?: string | null
          name: string
          pkce_enabled?: boolean
          provider_type: string
          scopes?: string[]
          skip_nonce_check?: boolean
          token_url?: string | null
          updated_at?: string
          userinfo_url?: string | null
        }
        Update: {
          acceptable_client_ids?: string[]
          attribute_mapping?: Json
          authorization_params?: Json
          authorization_url?: string | null
          cached_discovery?: Json | null
          client_id?: string
          client_secret?: string
          created_at?: string
          discovery_cached_at?: string | null
          discovery_url?: string | null
          email_optional?: boolean
          enabled?: boolean
          id?: string
          identifier?: string
          issuer?: string | null
          jwks_uri?: string | null
          name?: string
          pkce_enabled?: boolean
          provider_type?: string
          scopes?: string[]
          skip_nonce_check?: boolean
          token_url?: string | null
          updated_at?: string
          userinfo_url?: string | null
        }
        Relationships: []
      }
      flow_state: {
        Row: {
          auth_code: string | null
          auth_code_issued_at: string | null
          authentication_method: string
          code_challenge: string | null
          code_challenge_method:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at: string | null
          email_optional: boolean
          id: string
          invite_token: string | null
          linking_target_id: string | null
          oauth_client_state_id: string | null
          provider_access_token: string | null
          provider_refresh_token: string | null
          provider_type: string
          referrer: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth_code?: string | null
          auth_code_issued_at?: string | null
          authentication_method: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string | null
          email_optional?: boolean
          id: string
          invite_token?: string | null
          linking_target_id?: string | null
          oauth_client_state_id?: string | null
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type: string
          referrer?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth_code?: string | null
          auth_code_issued_at?: string | null
          authentication_method?: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string | null
          email_optional?: boolean
          id?: string
          invite_token?: string | null
          linking_target_id?: string | null
          oauth_client_state_id?: string | null
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type?: string
          referrer?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      identities: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          identity_data: Json
          last_sign_in_at: string | null
          provider: string
          provider_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data: Json
          last_sign_in_at?: string | null
          provider: string
          provider_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data?: Json
          last_sign_in_at?: string | null
          provider?: string
          provider_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identities_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          created_at: string | null
          id: string
          raw_base_config: string | null
          updated_at: string | null
          uuid: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Relationships: []
      }
      mfa_amr_claims: {
        Row: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Update: {
          authentication_method?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_amr_claims_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_challenges: {
        Row: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code: string | null
          verified_at: string | null
          web_authn_session_data: Json | null
        }
        Insert: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Update: {
          created_at?: string
          factor_id?: string
          id?: string
          ip_address?: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_challenges_auth_factor_id_fkey"
            columns: ["factor_id"]
            referencedRelation: "mfa_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_factors: {
        Row: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name: string | null
          id: string
          last_challenged_at: string | null
          last_webauthn_challenge_data: Json | null
          phone: string | null
          secret: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid: string | null
          web_authn_credential: Json | null
        }
        Insert: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Update: {
          created_at?: string
          factor_type?: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id?: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status?: Database["auth"]["Enums"]["factor_status"]
          updated_at?: string
          user_id?: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_factors_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_authorizations: {
        Row: {
          approved_at: string | null
          authorization_code: string | null
          authorization_id: string
          client_id: string
          code_challenge: string | null
          code_challenge_method:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at: string
          expires_at: string
          id: string
          nonce: string | null
          redirect_uri: string
          resource: string | null
          response_type: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state: string | null
          status: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id: string
          client_id: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id: string
          nonce?: string | null
          redirect_uri: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id?: string
          client_id?: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string | null
          redirect_uri?: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope?: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_authorizations_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_authorizations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_client_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          id: string
          provider_type: string
        }
        Insert: {
          code_verifier?: string | null
          created_at: string
          id: string
          provider_type: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          id?: string
          provider_type?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_name: string | null
          client_secret_hash: string | null
          client_type: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri: string | null
          created_at: string
          deleted_at: string | null
          grant_types: string
          id: string
          logo_uri: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types: string
          id: string
          logo_uri?: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types?: string
          id?: string
          logo_uri?: string | null
          redirect_uris?: string
          registration_type?: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_consents: {
        Row: {
          client_id: string
          granted_at: string
          id: string
          revoked_at: string | null
          scopes: string
          user_id: string
        }
        Insert: {
          client_id: string
          granted_at?: string
          id: string
          revoked_at?: string | null
          scopes: string
          user_id: string
        }
        Update: {
          client_id?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          scopes?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_consents_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_consents_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      one_time_tokens: {
        Row: {
          created_at: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relates_to?: string
          token_hash?: string
          token_type?: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_time_tokens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          id: number
          instance_id: string | null
          parent: string | null
          revoked: boolean | null
          session_id: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_providers: {
        Row: {
          attribute_mapping: Json | null
          created_at: string | null
          entity_id: string
          id: string
          metadata_url: string | null
          metadata_xml: string
          name_id_format: string | null
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id: string
          id: string
          metadata_url?: string | null
          metadata_xml: string
          name_id_format?: string | null
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id?: string
          id?: string
          metadata_url?: string | null
          metadata_xml?: string
          name_id_format?: string | null
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_providers_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_relay_states: {
        Row: {
          created_at: string | null
          flow_state_id: string | null
          for_email: string | null
          id: string
          redirect_to: string | null
          request_id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id: string
          redirect_to?: string | null
          request_id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id?: string
          redirect_to?: string | null
          request_id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_relay_states_flow_state_id_fkey"
            columns: ["flow_state_id"]
            referencedRelation: "flow_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saml_relay_states_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          version: string
        }
        Insert: {
          version: string
        }
        Update: {
          version?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          aal: Database["auth"]["Enums"]["aal_level"] | null
          created_at: string | null
          factor_id: string | null
          id: string
          ip: unknown | null
          not_after: string | null
          oauth_client_id: string | null
          refresh_token_counter: number | null
          refresh_token_hmac_key: string | null
          refreshed_at: string | null
          scopes: string | null
          tag: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id: string
          ip?: unknown | null
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id?: string
          ip?: unknown | null
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_oauth_client_id_fkey"
            columns: ["oauth_client_id"]
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_domains_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_providers: {
        Row: {
          created_at: string | null
          disabled: boolean | null
          id: string
          resource_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disabled?: boolean | null
          id: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disabled?: boolean | null
          id?: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean
          is_sso_user: boolean
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          expires_at: string
          id: string
          session_data: Json
          user_id: string | null
        }
        Insert: {
          challenge_type: string
          created_at?: string
          expires_at: string
          id?: string
          session_data: Json
          user_id?: string | null
        }
        Update: {
          challenge_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          session_data?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_challenges_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_credentials: {
        Row: {
          aaguid: string | null
          attestation_type: string
          backed_up: boolean
          backup_eligible: boolean
          created_at: string
          credential_id: string
          friendly_name: string
          id: string
          last_used_at: string | null
          public_key: string
          sign_count: number
          transports: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          aaguid?: string | null
          attestation_type?: string
          backed_up?: boolean
          backup_eligible?: boolean
          created_at?: string
          credential_id: string
          friendly_name?: string
          id?: string
          last_used_at?: string | null
          public_key: string
          sign_count?: number
          transports?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          aaguid?: string | null
          attestation_type?: string
          backed_up?: boolean
          backup_eligible?: boolean
          created_at?: string
          credential_id?: string
          friendly_name?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          sign_count?: number
          transports?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_credentials_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      jwt: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      aal_level: "aal1" | "aal2" | "aal3"
      code_challenge_method: "s256" | "plain"
      factor_status: "unverified" | "verified"
      factor_type: "totp" | "webauthn" | "phone"
      oauth_authorization_status: "pending" | "approved" | "denied" | "expired"
      oauth_client_type: "public" | "confidential"
      oauth_registration_type: "dynamic" | "manual"
      oauth_response_type: "code"
      one_time_token_type:
        | "confirmation_token"
        | "reauthentication_token"
        | "recovery_token"
        | "email_change_token_new"
        | "email_change_token_current"
        | "phone_change_token"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  cron: {
    Tables: {
      job: {
        Row: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string | null
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }
        Insert: {
          active?: boolean
          command: string
          database?: string
          jobid?: number
          jobname?: string | null
          nodename?: string
          nodeport?: number
          schedule: string
          username?: string
        }
        Update: {
          active?: boolean
          command?: string
          database?: string
          jobid?: number
          jobname?: string | null
          nodename?: string
          nodeport?: number
          schedule?: string
          username?: string
        }
        Relationships: []
      }
      job_run_details: {
        Row: {
          command: string | null
          database: string | null
          end_time: string | null
          job_pid: number | null
          jobid: number | null
          return_message: string | null
          runid: number
          start_time: string | null
          status: string | null
          username: string | null
        }
        Insert: {
          command?: string | null
          database?: string | null
          end_time?: string | null
          job_pid?: number | null
          jobid?: number | null
          return_message?: string | null
          runid?: number
          start_time?: string | null
          status?: string | null
          username?: string | null
        }
        Update: {
          command?: string | null
          database?: string | null
          end_time?: string | null
          job_pid?: number | null
          jobid?: number | null
          return_message?: string | null
          runid?: number
          start_time?: string | null
          status?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alter_job: {
        Args: {
          active?: boolean
          command?: string
          database?: string
          job_id: number
          schedule?: string
          username?: string
        }
        Returns: undefined
      }
      schedule: {
        Args:
          | { command: string; job_name: string; schedule: string }
          | { command: string; schedule: string }
        Returns: number
      }
      schedule_in_database: {
        Args: {
          active?: boolean
          command: string
          database: string
          job_name: string
          schedule: string
          username?: string
        }
        Returns: number
      }
      unschedule: {
        Args: { job_id: number } | { job_name: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  extensions: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      pg_stat_statements: {
        Row: {
          blk_read_time: number | null
          blk_write_time: number | null
          calls: number | null
          dbid: unknown | null
          jit_emission_count: number | null
          jit_emission_time: number | null
          jit_functions: number | null
          jit_generation_time: number | null
          jit_inlining_count: number | null
          jit_inlining_time: number | null
          jit_optimization_count: number | null
          jit_optimization_time: number | null
          local_blks_dirtied: number | null
          local_blks_hit: number | null
          local_blks_read: number | null
          local_blks_written: number | null
          max_exec_time: number | null
          max_plan_time: number | null
          mean_exec_time: number | null
          mean_plan_time: number | null
          min_exec_time: number | null
          min_plan_time: number | null
          plans: number | null
          query: string | null
          queryid: number | null
          rows: number | null
          shared_blks_dirtied: number | null
          shared_blks_hit: number | null
          shared_blks_read: number | null
          shared_blks_written: number | null
          stddev_exec_time: number | null
          stddev_plan_time: number | null
          temp_blk_read_time: number | null
          temp_blk_write_time: number | null
          temp_blks_read: number | null
          temp_blks_written: number | null
          toplevel: boolean | null
          total_exec_time: number | null
          total_plan_time: number | null
          userid: unknown | null
          wal_bytes: number | null
          wal_fpi: number | null
          wal_records: number | null
        }
        Relationships: []
      }
      pg_stat_statements_info: {
        Row: {
          dealloc: number | null
          stats_reset: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      algorithm_sign: {
        Args: { algorithm: string; secret: string; signables: string }
        Returns: string
      }
      armor: {
        Args: { "": string }
        Returns: string
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      dearmor: {
        Args: { "": string }
        Returns: string
      }
      gen_random_bytes: {
        Args: { "": number }
        Returns: string
      }
      gen_random_uuid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gen_salt: {
        Args: { "": string }
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      pg_stat_statements: {
        Args: { showtext: boolean }
        Returns: Record<string, unknown>[]
      }
      pg_stat_statements_info: {
        Args: Record<PropertyKey, never>
        Returns: Record<string, unknown>
      }
      pg_stat_statements_reset: {
        Args: { dbid?: unknown; queryid?: number; userid?: unknown }
        Returns: undefined
      }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgp_key_id: {
        Args: { "": string }
        Returns: string
      }
      sign: {
        Args: { algorithm?: string; payload: Json; secret: string }
        Returns: string
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      try_cast_double: {
        Args: { inp: string }
        Returns: number
      }
      url_decode: {
        Args: { data: string }
        Returns: string
      }
      url_encode: {
        Args: { data: string }
        Returns: string
      }
      uuid_generate_v1: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v1mc: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v3: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_generate_v4: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v5: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_nil: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_dns: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_oid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_url: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_x500: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      verify: {
        Args: { algorithm?: string; secret: string; token: string }
        Returns: {
          header: Json
          payload: Json
          valid: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  graphql: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _internal_resolve: {
        Args: {
          extensions?: Json
          operationName?: string
          query: string
          variables?: Json
        }
        Returns: Json
      }
      comment_directive: {
        Args: { comment_: string }
        Returns: Json
      }
      exception: {
        Args: { message: string }
        Returns: string
      }
      get_schema_version: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      resolve: {
        Args: {
          extensions?: Json
          operationName?: string
          query: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  net: {
    Tables: {
      _http_response: {
        Row: {
          content: string | null
          content_type: string | null
          created: string
          error_msg: string | null
          headers: Json | null
          id: number | null
          status_code: number | null
          timed_out: boolean | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          created?: string
          error_msg?: string | null
          headers?: Json | null
          id?: number | null
          status_code?: number | null
          timed_out?: boolean | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          created?: string
          error_msg?: string | null
          headers?: Json | null
          id?: number | null
          status_code?: number | null
          timed_out?: boolean | null
        }
        Relationships: []
      }
      http_request_queue: {
        Row: {
          body: string | null
          headers: Json
          id: number
          method: string
          timeout_milliseconds: number
          url: string
        }
        Insert: {
          body?: string | null
          headers: Json
          id?: number
          method: string
          timeout_milliseconds: number
          url: string
        }
        Update: {
          body?: string | null
          headers?: Json
          id?: number
          method?: string
          timeout_milliseconds?: number
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _await_response: {
        Args: { request_id: number }
        Returns: boolean
      }
      _encode_url_with_params_array: {
        Args: { params_array: string[]; url: string }
        Returns: string
      }
      _http_collect_response: {
        Args: { async?: boolean; request_id: number }
        Returns: Database["net"]["CompositeTypes"]["http_response_result"]
      }
      _urlencode_string: {
        Args: { string: string }
        Returns: string
      }
      check_worker_is_up: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      http_collect_response: {
        Args: { async?: boolean; request_id: number }
        Returns: Database["net"]["CompositeTypes"]["http_response_result"]
      }
      http_delete: {
        Args: {
          headers?: Json
          params?: Json
          timeout_milliseconds?: number
          url: string
        }
        Returns: number
      }
      http_get: {
        Args: {
          headers?: Json
          params?: Json
          timeout_milliseconds?: number
          url: string
        }
        Returns: number
      }
      http_post: {
        Args: {
          body?: Json
          headers?: Json
          params?: Json
          timeout_milliseconds?: number
          url: string
        }
        Returns: number
      }
      worker_restart: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      request_status: "PENDING" | "SUCCESS" | "ERROR"
    }
    CompositeTypes: {
      http_response: {
        status_code: number | null
        headers: Json | null
        body: string | null
      }
      http_response_result: {
        status: Database["net"]["Enums"]["request_status"] | null
        message: string | null
        response: Database["net"]["CompositeTypes"]["http_response"] | null
      }
    }
  }
  pgbouncer: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth: {
        Args: { p_usename: string }
        Returns: {
          password: string
          username: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      amcf_analysis_items: {
        Row: {
          analysis_id: string
          case_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          kind: string
          position: number
          section: string
          title: string
          updated_at: string
        }
        Insert: {
          analysis_id: string
          case_id: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          position?: number
          section: string
          title: string
          updated_at?: string
        }
        Update: {
          analysis_id?: string
          case_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          position?: number
          section?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_analysis_items_analysis_id_fkey"
            columns: ["analysis_id"]
            referencedRelation: "amcf_case_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_analysis_items_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_analysis_items_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          case_id: string | null
          changed_fields: string[]
          created_at: string
          id: number
          resource: string
          resource_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          case_id?: string | null
          changed_fields?: string[]
          created_at?: string
          id?: never
          resource: string
          resource_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          case_id?: string | null
          changed_fields?: string[]
          created_at?: string
          id?: never
          resource?: string
          resource_id?: string | null
        }
        Relationships: []
      }
      amcf_case_analyses: {
        Row: {
          approval_note: string
          approved_at: string | null
          approved_by: string | null
          case_id: string
          created_at: string
          created_by: string
          engine: string
          id: string
          input_fingerprint: string | null
          input_summary: Json
          method: string
          status: string
          summary: string
          title: string
          updated_at: string
          version: number
          warnings: Json
        }
        Insert: {
          approval_note?: string
          approved_at?: string | null
          approved_by?: string | null
          case_id: string
          created_at?: string
          created_by?: string
          engine?: string
          id?: string
          input_fingerprint?: string | null
          input_summary?: Json
          method?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          version: number
          warnings?: Json
        }
        Update: {
          approval_note?: string
          approved_at?: string | null
          approved_by?: string | null
          case_id?: string
          created_at?: string
          created_by?: string
          engine?: string
          id?: string
          input_fingerprint?: string | null
          input_summary?: Json
          method?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          version?: number
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "amcf_case_analyses_approved_by_fkey"
            columns: ["approved_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_case_analyses_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_case_analyses_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_case_assignments: {
        Row: {
          case_id: string
          created_at: string
          member_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          member_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_case_assignments_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_case_assignments_member_id_fkey"
            columns: ["member_id"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_case_chats: {
        Row: {
          case_id: string
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_case_chats_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_case_chats_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_case_checklist: {
        Row: {
          case_id: string
          completed: boolean
          created_at: string
          created_by: string
          id: string
          title: string
        }
        Insert: {
          case_id: string
          completed?: boolean
          created_at?: string
          created_by?: string
          id?: string
          title: string
        }
        Update: {
          case_id?: string
          completed?: boolean
          created_at?: string
          created_by?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_case_checklist_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_case_checklist_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_case_financial_events: {
        Row: {
          amount_cents: number
          case_id: string
          created_at: string
          created_by: string
          description: string
          expected_on: string | null
          id: string
          kind: string
          notes: string
          reference: string
          settled_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          case_id: string
          created_at?: string
          created_by?: string
          description: string
          expected_on?: string | null
          id?: string
          kind: string
          notes?: string
          reference?: string
          settled_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          case_id?: string
          created_at?: string
          created_by?: string
          description?: string
          expected_on?: string | null
          id?: string
          kind?: string
          notes?: string
          reference?: string
          settled_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_case_financial_events_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_case_financial_events_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_case_messages: {
        Row: {
          case_id: string
          chat_id: string
          content: string
          created_at: string
          created_by: string
          engine: string
          engine_note: string
          id: string
          role: string
          sources: Json
        }
        Insert: {
          case_id: string
          chat_id: string
          content: string
          created_at?: string
          created_by?: string
          engine?: string
          engine_note?: string
          id?: string
          role: string
          sources?: Json
        }
        Update: {
          case_id?: string
          chat_id?: string
          content?: string
          created_at?: string
          created_by?: string
          engine?: string
          engine_note?: string
          id?: string
          role?: string
          sources?: Json
        }
        Relationships: [
          {
            foreignKeyName: "amcf_case_messages_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_case_messages_chat_id_fkey"
            columns: ["chat_id"]
            referencedRelation: "amcf_case_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_case_messages_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_case_questions: {
        Row: {
          author_detail: string
          author_kind: string
          case_id: string
          created_at: string
          created_by: string
          id: string
          number: number
          position: number
          status: string
          text: string
          topic: string
          updated_at: string
        }
        Insert: {
          author_detail?: string
          author_kind?: string
          case_id: string
          created_at?: string
          created_by?: string
          id?: string
          number: number
          position?: number
          status?: string
          text: string
          topic?: string
          updated_at?: string
        }
        Update: {
          author_detail?: string
          author_kind?: string
          case_id?: string
          created_at?: string
          created_by?: string
          id?: string
          number?: number
          position?: number
          status?: string
          text?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_case_questions_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_case_questions_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_case_stages: {
        Row: {
          id: string
          name: string
          position: number
          terminal: boolean
        }
        Insert: {
          id?: string
          name: string
          position: number
          terminal?: boolean
        }
        Update: {
          id?: string
          name?: string
          position?: number
          terminal?: boolean
        }
        Relationships: []
      }
      amcf_case_steps: {
        Row: {
          case_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          detail: string
          id: string
          label: string
          next_action: string
          next_action_on: string | null
          position: number
          status: string
          updated_at: string
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          detail?: string
          id?: string
          label: string
          next_action?: string
          next_action_on?: string | null
          position?: number
          status?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          detail?: string
          id?: string
          label?: string
          next_action?: string
          next_action_on?: string | null
          position?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_case_steps_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_case_steps_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_cases: {
        Row: {
          action_type: string | null
          administrative_summary: string
          archived_at: string | null
          case_secret: boolean
          claim_summary: string | null
          claimant: string | null
          cnj_number: string | null
          contact_id: string
          court: string | null
          court_unit: string | null
          created_at: string
          created_by: string
          defendant: string | null
          due_on: string | null
          id: string
          opened_on: string
          opportunity_id: string | null
          reference: string
          responsible_id: string
          service: string
          stage_id: string
          title: string
          updated_at: string
        }
        Insert: {
          action_type?: string | null
          administrative_summary?: string
          archived_at?: string | null
          case_secret?: boolean
          claim_summary?: string | null
          claimant?: string | null
          cnj_number?: string | null
          contact_id: string
          court?: string | null
          court_unit?: string | null
          created_at?: string
          created_by?: string
          defendant?: string | null
          due_on?: string | null
          id?: string
          opened_on?: string
          opportunity_id?: string | null
          reference: string
          responsible_id: string
          service: string
          stage_id: string
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string | null
          administrative_summary?: string
          archived_at?: string | null
          case_secret?: boolean
          claim_summary?: string | null
          claimant?: string | null
          cnj_number?: string | null
          contact_id?: string
          court?: string | null
          court_unit?: string | null
          created_at?: string
          created_by?: string
          defendant?: string | null
          due_on?: string | null
          id?: string
          opened_on?: string
          opportunity_id?: string | null
          reference?: string
          responsible_id?: string
          service?: string
          stage_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_cases_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "amcf_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_cases_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_cases_opportunity_id_fkey"
            columns: ["opportunity_id"]
            referencedRelation: "amcf_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_cases_responsible_id_fkey"
            columns: ["responsible_id"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_cases_stage_id_fkey"
            columns: ["stage_id"]
            referencedRelation: "amcf_case_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_contacts: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          kind: string
          name: string
          notes: string
          organization_id: string | null
          phone: string | null
          responsible_id: string
          source: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          kind?: string
          name: string
          notes?: string
          organization_id?: string | null
          phone?: string | null
          responsible_id?: string
          source?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          kind?: string
          name?: string
          notes?: string
          organization_id?: string | null
          phone?: string | null
          responsible_id?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_contacts_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_contacts_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "amcf_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_contacts_responsible_id_fkey"
            columns: ["responsible_id"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_court_sources: {
        Row: {
          coverage: string[]
          created_at: string
          created_by: string | null
          credential_name: string | null
          enabled: boolean
          endpoint: string
          id: string
          kind: string
          label: string
          last_check_at: string | null
          last_status: string
          uncovered_note: string
          updated_at: string
        }
        Insert: {
          coverage?: string[]
          created_at?: string
          created_by?: string | null
          credential_name?: string | null
          enabled?: boolean
          endpoint?: string
          id?: string
          kind?: string
          label: string
          last_check_at?: string | null
          last_status?: string
          uncovered_note?: string
          updated_at?: string
        }
        Update: {
          coverage?: string[]
          created_at?: string
          created_by?: string | null
          credential_name?: string | null
          enabled?: boolean
          endpoint?: string
          id?: string
          kind?: string
          label?: string
          last_check_at?: string | null
          last_status?: string
          uncovered_note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_court_sources_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_document_files: {
        Row: {
          content: string
          created_at: string
          document_id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_document_files_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "amcf_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_document_jobs: {
        Row: {
          attempts: number
          created_at: string
          detail: Json
          document_id: string
          finished_at: string | null
          id: string
          kind: string
          last_error: string | null
          requested_by: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          detail?: Json
          document_id: string
          finished_at?: string | null
          id?: string
          kind: string
          last_error?: string | null
          requested_by?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          detail?: Json
          document_id?: string
          finished_at?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          requested_by?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_document_jobs_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "amcf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_document_jobs_requested_by_fkey"
            columns: ["requested_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_document_pages: {
        Row: {
          char_count: number
          content: string
          created_at: string
          document_id: string
          extraction_status: string
          id: string
          page_number: number
        }
        Insert: {
          char_count?: number
          content?: string
          created_at?: string
          document_id: string
          extraction_status?: string
          id?: string
          page_number: number
        }
        Update: {
          char_count?: number
          content?: string
          created_at?: string
          document_id?: string
          extraction_status?: string
          id?: string
          page_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "amcf_document_pages_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "amcf_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_documents: {
        Row: {
          case_id: string
          category: string
          category_confirmed: boolean
          category_confirmed_at: string | null
          category_confirmed_by: string | null
          contact_id: string | null
          content_hash: string | null
          created_at: string
          document_date: string | null
          extracted_at: string | null
          extraction_engine: string | null
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          suggested_category: string | null
          text_chars: number
          text_error: string | null
          text_pages: number
          text_status: string
          title: string
          uploaded_by: string
        }
        Insert: {
          case_id: string
          category?: string
          category_confirmed?: boolean
          category_confirmed_at?: string | null
          category_confirmed_by?: string | null
          contact_id?: string | null
          content_hash?: string | null
          created_at?: string
          document_date?: string | null
          extracted_at?: string | null
          extraction_engine?: string | null
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          suggested_category?: string | null
          text_chars?: number
          text_error?: string | null
          text_pages?: number
          text_status?: string
          title: string
          uploaded_by?: string
        }
        Update: {
          case_id?: string
          category?: string
          category_confirmed?: boolean
          category_confirmed_at?: string | null
          category_confirmed_by?: string | null
          contact_id?: string | null
          content_hash?: string | null
          created_at?: string
          document_date?: string | null
          extracted_at?: string | null
          extraction_engine?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          suggested_category?: string | null
          text_chars?: number
          text_error?: string | null
          text_pages?: number
          text_status?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_documents_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_documents_category_confirmed_by_fkey"
            columns: ["category_confirmed_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_documents_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "amcf_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_exam_findings: {
        Row: {
          case_id: string
          created_at: string
          detail: string
          exam_id: string
          id: string
          kind: string
          recorded_by: string
          source_document_id: string | null
          source_page: number | null
          title: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          detail?: string
          exam_id: string
          id?: string
          kind?: string
          recorded_by?: string
          source_document_id?: string | null
          source_page?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          detail?: string
          exam_id?: string
          id?: string
          kind?: string
          recorded_by?: string
          source_document_id?: string | null
          source_page?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_exam_findings_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_exam_findings_exam_id_fkey"
            columns: ["exam_id"]
            referencedRelation: "amcf_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_exam_findings_recorded_by_fkey"
            columns: ["recorded_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_exam_findings_source_document_id_fkey"
            columns: ["source_document_id"]
            referencedRelation: "amcf_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_exams: {
        Row: {
          case_id: string
          created_at: string
          created_by: string
          exam_on: string
          examined_party: string
          id: string
          method_notes: string
          modality: string
          place: string
          status: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string
          exam_on: string
          examined_party?: string
          id?: string
          method_notes?: string
          modality?: string
          place?: string
          status?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string
          exam_on?: string
          examined_party?: string
          id?: string
          method_notes?: string
          modality?: string
          place?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_exams_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_exams_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_integration_deliveries: {
        Row: {
          attempts: number
          created_at: string
          event_id: number
          hook_id: string
          id: number
          request_id: number | null
          status: number | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_id: number
          hook_id: string
          id?: never
          request_id?: number | null
          status?: number | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_id?: number
          hook_id?: string
          id?: never
          request_id?: number | null
          status?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_integration_deliveries_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "amcf_integration_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_integration_deliveries_hook_id_fkey"
            columns: ["hook_id"]
            referencedRelation: "amcf_integration_hooks"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_integration_events: {
        Row: {
          created_at: string
          delivered_at: string | null
          event: string
          id: number
          payload: Json
          resource: string
          resource_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          event: string
          id?: never
          payload?: Json
          resource: string
          resource_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          event?: string
          id?: never
          payload?: Json
          resource?: string
          resource_id?: string | null
        }
        Relationships: []
      }
      amcf_integration_hooks: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          events: string[]
          id: string
          label: string
          secret: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          label: string
          secret: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          label?: string
          secret?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_integration_hooks_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_integration_keys: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          owner_id: string
          revoked_at: string | null
          scopes: string[]
          token_hash: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          last_used_at?: string | null
          owner_id: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          owner_id?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_integration_keys_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_integration_logs: {
        Row: {
          action: string
          at: string
          detail: string | null
          external_ref: string | null
          id: number
          key_id: string | null
          resource: string | null
          resource_id: string | null
          source: string
          success: boolean
        }
        Insert: {
          action: string
          at?: string
          detail?: string | null
          external_ref?: string | null
          id?: never
          key_id?: string | null
          resource?: string | null
          resource_id?: string | null
          source?: string
          success: boolean
        }
        Update: {
          action?: string
          at?: string
          detail?: string | null
          external_ref?: string | null
          id?: never
          key_id?: string | null
          resource?: string | null
          resource_id?: string | null
          source?: string
          success?: boolean
        }
        Relationships: []
      }
      amcf_integration_refs: {
        Row: {
          created_at: string
          external_ref: string
          key_id: string
          resource: string
          resource_id: string
        }
        Insert: {
          created_at?: string
          external_ref: string
          key_id: string
          resource: string
          resource_id: string
        }
        Update: {
          created_at?: string
          external_ref?: string
          key_id?: string
          resource?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_integration_refs_key_id_fkey"
            columns: ["key_id"]
            referencedRelation: "amcf_integration_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_interactions: {
        Row: {
          case_id: string | null
          contact_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          next_on: string | null
          next_step: string
          summary: string
        }
        Insert: {
          case_id?: string | null
          contact_id: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          next_on?: string | null
          next_step?: string
          summary: string
        }
        Update: {
          case_id?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          next_on?: string | null
          next_step?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_interactions_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_interactions_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "amcf_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_interactions_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_members: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          status?: string
        }
        Relationships: []
      }
      amcf_movement_syncs: {
        Row: {
          case_id: string
          coverage: string[]
          created_by: string | null
          detail: Json
          error: string | null
          finished_at: string | null
          id: string
          items_duplicated: number
          items_found: number
          items_new: number
          source_kind: string
          started_at: string
          status: string
        }
        Insert: {
          case_id: string
          coverage?: string[]
          created_by?: string | null
          detail?: Json
          error?: string | null
          finished_at?: string | null
          id?: string
          items_duplicated?: number
          items_found?: number
          items_new?: number
          source_kind: string
          started_at?: string
          status: string
        }
        Update: {
          case_id?: string
          coverage?: string[]
          created_by?: string | null
          detail?: Json
          error?: string | null
          finished_at?: string | null
          id?: string
          items_duplicated?: number
          items_found?: number
          items_new?: number
          source_kind?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_movement_syncs_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_movement_syncs_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_movements: {
        Row: {
          case_id: string
          classification: string
          classification_note: string
          classified_by: string
          created_at: string
          created_by: string
          dedupe_hash: string
          detail: string
          external_ref: string | null
          id: string
          needs_human_review: boolean
          occurred_at: string | null
          occurred_on: string
          review_state: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          case_id: string
          classification?: string
          classification_note?: string
          classified_by?: string
          created_at?: string
          created_by?: string
          dedupe_hash: string
          detail?: string
          external_ref?: string | null
          id?: string
          needs_human_review?: boolean
          occurred_at?: string | null
          occurred_on: string
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          classification?: string
          classification_note?: string
          classified_by?: string
          created_at?: string
          created_by?: string
          dedupe_hash?: string
          detail?: string
          external_ref?: string | null
          id?: string
          needs_human_review?: boolean
          occurred_at?: string | null
          occurred_on?: string
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_movements_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_movements_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_movements_reviewed_by_fkey"
            columns: ["reviewed_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_notifications: {
        Row: {
          body: string
          case_id: string | null
          created_at: string
          id: string
          kind: string
          member_id: string
          read_at: string | null
          resource: string | null
          resource_id: string | null
          title: string
        }
        Insert: {
          body?: string
          case_id?: string | null
          created_at?: string
          id?: string
          kind: string
          member_id: string
          read_at?: string | null
          resource?: string | null
          resource_id?: string | null
          title: string
        }
        Update: {
          body?: string
          case_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          member_id?: string
          read_at?: string | null
          resource?: string | null
          resource_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_notifications_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_notifications_member_id_fkey"
            columns: ["member_id"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_opportunities: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string
          id: string
          loss_reason: string | null
          next_step: string
          responsible_id: string
          service: string
          stage_id: string
          title: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string
          id?: string
          loss_reason?: string | null
          next_step?: string
          responsible_id?: string
          service: string
          stage_id: string
          title: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string
          id?: string
          loss_reason?: string | null
          next_step?: string
          responsible_id?: string
          service?: string
          stage_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_opportunities_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "amcf_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_opportunities_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_opportunities_responsible_id_fkey"
            columns: ["responsible_id"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_opportunities_stage_id_fkey"
            columns: ["stage_id"]
            referencedRelation: "amcf_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_opportunity_values: {
        Row: {
          amount_cents: number
          opportunity_id: string
        }
        Insert: {
          amount_cents: number
          opportunity_id: string
        }
        Update: {
          amount_cents?: number
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_opportunity_values_opportunity_id_fkey"
            columns: ["opportunity_id"]
            referencedRelation: "amcf_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_organizations_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_pipeline_stages: {
        Row: {
          id: string
          name: string
          outcome: string
          position: number
        }
        Insert: {
          id?: string
          name: string
          outcome?: string
          position: number
        }
        Update: {
          id?: string
          name?: string
          outcome?: string
          position?: number
        }
        Relationships: []
      }
      amcf_proposals: {
        Row: {
          amount_cents: number
          case_id: string | null
          contact_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          notes: string
          opportunity_id: string | null
          responsible_id: string
          service: string
          status: string
          title: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          amount_cents: number
          case_id?: string | null
          contact_id: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          notes?: string
          opportunity_id?: string | null
          responsible_id?: string
          service: string
          status?: string
          title: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          amount_cents?: number
          case_id?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          notes?: string
          opportunity_id?: string | null
          responsible_id?: string
          service?: string
          status?: string
          title?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amcf_proposals_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_proposals_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "amcf_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_proposals_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            referencedRelation: "amcf_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_proposals_responsible_id_fkey"
            columns: ["responsible_id"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_question_answers: {
        Row: {
          answer: string
          case_id: string
          created_at: string
          created_by: string
          id: string
          question_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          answer?: string
          case_id: string
          created_at?: string
          created_by?: string
          id?: string
          question_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          answer?: string
          case_id?: string
          created_at?: string
          created_by?: string
          id?: string
          question_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_question_answers_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_question_answers_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_question_answers_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "amcf_case_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_question_answers_reviewed_by_fkey"
            columns: ["reviewed_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_receivables: {
        Row: {
          amount_cents: number
          case_id: string | null
          contact_id: string
          created_at: string
          created_by: string
          description: string
          due_on: string
          id: string
          notes: string
          paid_on: string | null
          payment_method: string | null
          proposal_id: string | null
          responsible_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          case_id?: string | null
          contact_id: string
          created_at?: string
          created_by?: string
          description: string
          due_on: string
          id?: string
          notes?: string
          paid_on?: string | null
          payment_method?: string | null
          proposal_id?: string | null
          responsible_id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          case_id?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string
          description?: string
          due_on?: string
          id?: string
          notes?: string
          paid_on?: string | null
          payment_method?: string | null
          proposal_id?: string | null
          responsible_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_receivables_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_receivables_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "amcf_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_receivables_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_receivables_proposal_id_fkey"
            columns: ["proposal_id"]
            referencedRelation: "amcf_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_receivables_responsible_id_fkey"
            columns: ["responsible_id"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_references: {
        Row: {
          case_id: string | null
          citation: string
          created_at: string
          created_by: string
          id: string
          identifier: string
          kind: string
          notes: string
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          case_id?: string | null
          citation: string
          created_at?: string
          created_by?: string
          id?: string
          identifier?: string
          kind?: string
          notes?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          case_id?: string | null
          citation?: string
          created_at?: string
          created_by?: string
          id?: string
          identifier?: string
          kind?: string
          notes?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amcf_references_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_references_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_references_verified_by_fkey"
            columns: ["verified_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_report_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          scope: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          scope?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_report_templates_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_reports: {
        Row: {
          analysis_id: string | null
          approval_note: string
          approved_at: string | null
          approved_by: string | null
          based_on: string | null
          body: string
          case_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          readiness: Json
          status: string
          template_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          analysis_id?: string | null
          approval_note?: string
          approved_at?: string | null
          approved_by?: string | null
          based_on?: string | null
          body?: string
          case_id: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          readiness?: Json
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          version: number
        }
        Update: {
          analysis_id?: string | null
          approval_note?: string
          approved_at?: string | null
          approved_by?: string | null
          based_on?: string | null
          body?: string
          case_id?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          readiness?: Json
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "amcf_reports_analysis_id_fkey"
            columns: ["analysis_id"]
            referencedRelation: "amcf_case_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_reports_approved_by_fkey"
            columns: ["approved_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_reports_based_on_fkey"
            columns: ["based_on"]
            referencedRelation: "amcf_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_reports_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_reports_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_reports_template_id_fkey"
            columns: ["template_id"]
            referencedRelation: "amcf_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_settings: {
        Row: {
          app_origin: string | null
          environment: string
          id: boolean
          timezone: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          app_origin?: string | null
          environment?: string
          id?: boolean
          timezone?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          app_origin?: string | null
          environment?: string
          id?: boolean
          timezone?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      amcf_source_refs: {
        Row: {
          case_id: string
          created_at: string
          created_by: string
          document_id: string | null
          finding_id: string | null
          id: string
          movement_id: string | null
          owner_id: string
          owner_kind: string
          page_number: number | null
          question_id: string | null
          quote: string
          reference_id: string | null
          source_kind: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string
          document_id?: string | null
          finding_id?: string | null
          id?: string
          movement_id?: string | null
          owner_id: string
          owner_kind: string
          page_number?: number | null
          question_id?: string | null
          quote?: string
          reference_id?: string | null
          source_kind: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string
          document_id?: string | null
          finding_id?: string | null
          id?: string
          movement_id?: string | null
          owner_id?: string
          owner_kind?: string
          page_number?: number | null
          question_id?: string | null
          quote?: string
          reference_id?: string | null
          source_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_source_refs_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_source_refs_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_source_refs_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "amcf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_source_refs_finding_id_fkey"
            columns: ["finding_id"]
            referencedRelation: "amcf_exam_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_source_refs_movement_id_fkey"
            columns: ["movement_id"]
            referencedRelation: "amcf_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_source_refs_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "amcf_case_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_source_refs_reference_id_fkey"
            columns: ["reference_id"]
            referencedRelation: "amcf_references"
            referencedColumns: ["id"]
          },
        ]
      }
      amcf_tasks: {
        Row: {
          case_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          description: string
          due_on: string
          id: string
          priority: string
          responsible_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_on: string
          id?: string
          priority?: string
          responsible_id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_on?: string
          id?: string
          priority?: string
          responsible_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amcf_tasks_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "amcf_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_tasks_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "amcf_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_tasks_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amcf_tasks_responsible_id_fkey"
            columns: ["responsible_id"]
            referencedRelation: "amcf_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      amcf_access_context: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      amcf_analysis_approve: {
        Args: { p_analysis: string; p_note?: string }
        Returns: Json
      }
      amcf_analysis_compose: {
        Args: { p_analysis: string }
        Returns: Json
      }
      amcf_analysis_create: {
        Args: { p_case: string; p_from?: string; p_title?: string }
        Returns: string
      }
      amcf_api_activity_create: {
        Args: {
          p_case_id?: string
          p_contact_id: string
          p_external_ref: string
          p_kind?: string
          p_next_on?: string
          p_next_step?: string
          p_summary: string
          p_token: string
        }
        Returns: Json
      }
      amcf_api_agenda: {
        Args: { p_from: string; p_to: string; p_token: string }
        Returns: Json
      }
      amcf_api_case_create: {
        Args: {
          p_contact_id: string
          p_due_on?: string
          p_external_ref: string
          p_opportunity_id?: string
          p_reference?: string
          p_service: string
          p_title: string
          p_token: string
        }
        Returns: Json
      }
      amcf_api_case_read: {
        Args: { p_case_id: string; p_token: string }
        Returns: Json
      }
      amcf_api_contact_upsert: {
        Args: {
          p_email?: string
          p_external_ref: string
          p_kind?: string
          p_name: string
          p_notes?: string
          p_phone?: string
          p_source?: string
          p_token: string
        }
        Returns: Json
      }
      amcf_api_events: {
        Args: { p_limit?: number; p_token: string }
        Returns: Json
      }
      amcf_api_key: {
        Args: { p_scope: string; p_token: string }
        Returns: string
      }
      amcf_api_log: {
        Args: {
          p_action: string
          p_detail?: string
          p_external_ref?: string
          p_key: string
          p_resource?: string
          p_resource_id?: string
          p_success: boolean
        }
        Returns: undefined
      }
      amcf_api_movement_upsert: {
        Args: {
          p_case_id: string
          p_classification?: string
          p_detail?: string
          p_external_ref: string
          p_occurred_on: string
          p_title: string
          p_token: string
        }
        Returns: Json
      }
      amcf_api_opportunity_stage: {
        Args: {
          p_opportunity_id: string
          p_stage_name: string
          p_token: string
        }
        Returns: Json
      }
      amcf_api_opportunity_upsert: {
        Args: {
          p_amount_cents?: number
          p_contact_id: string
          p_external_ref: string
          p_next_step?: string
          p_service: string
          p_stage_name?: string
          p_title: string
          p_token: string
        }
        Returns: Json
      }
      amcf_api_owner: {
        Args: { p_key: string }
        Returns: string
      }
      amcf_api_ping: {
        Args: { p_token: string }
        Returns: Json
      }
      amcf_api_task_upsert: {
        Args: {
          p_case_id?: string
          p_contact_id?: string
          p_description?: string
          p_due_on: string
          p_external_ref: string
          p_priority?: string
          p_responsible_id?: string
          p_status?: string
          p_title: string
          p_token: string
        }
        Returns: Json
      }
      amcf_can_approve: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      amcf_can_case: {
        Args: { target: string }
        Returns: boolean
      }
      amcf_can_contact: {
        Args: { target: string }
        Returns: boolean
      }
      amcf_can_object: {
        Args: { object_name: string }
        Returns: boolean
      }
      amcf_case_input_fingerprint: {
        Args: { target: string }
        Returns: string
      }
      amcf_case_input_summary: {
        Args: { target: string }
        Returns: Json
      }
      amcf_case_next_action: {
        Args: { target: string }
        Returns: Json
      }
      amcf_case_readiness: {
        Args: { target: string }
        Returns: Json
      }
      amcf_case_search: {
        Args: { p_case: string; p_term: string }
        Returns: Json
      }
      amcf_classify_movement: {
        Args: { p_detail?: string; p_title: string }
        Returns: {
          classification: string
          matched: string
          needs_human_review: boolean
        }[]
      }
      amcf_convert_opportunity: {
        Args: { target: string }
        Returns: string
      }
      amcf_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      amcf_directory: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          role: string
        }[]
      }
      amcf_integration_retry_failures: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      amcf_is_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      amcf_manage_member: {
        Args: { new_role: string; new_status: string; target: string }
        Returns: undefined
      }
      amcf_my_day: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      amcf_report: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      amcf_report_approve: {
        Args: { p_note?: string; p_report: string }
        Returns: Json
      }
      amcf_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  realtime: {
    Tables: {
      messages: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_10_04: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_10_05: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_10_06: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_10_07: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_10_08: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_10_09: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_10_10: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          inserted_at: string | null
          version: number
        }
        Insert: {
          inserted_at?: string | null
          version: number
        }
        Update: {
          inserted_at?: string | null
          version?: number
        }
        Relationships: []
      }
      subscription: {
        Row: {
          claims: Json
          claims_role: unknown
          created_at: string
          entity: unknown
          filters: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id: number
          subscription_id: string
        }
        Insert: {
          claims: Json
          claims_role?: unknown
          created_at?: string
          entity: unknown
          filters?: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id?: never
          subscription_id: string
        }
        Update: {
          claims?: Json
          claims_role?: unknown
          created_at?: string
          entity?: unknown
          filters?: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id?: never
          subscription_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_rls: {
        Args: { max_record_bytes?: number; wal: Json }
        Returns: Database["realtime"]["CompositeTypes"]["wal_rls"][]
      }
      broadcast_changes: {
        Args: {
          event_name: string
          level?: string
          new: Record<string, unknown>
          old: Record<string, unknown>
          operation: string
          table_name: string
          table_schema: string
          topic_name: string
        }
        Returns: undefined
      }
      build_prepared_statement_sql: {
        Args: {
          columns: Database["realtime"]["CompositeTypes"]["wal_column"][]
          entity: unknown
          prepared_statement_name: string
        }
        Returns: string
      }
      cast: {
        Args: { type_: unknown; val: string }
        Returns: Json
      }
      check_equality_op: {
        Args: {
          op: Database["realtime"]["Enums"]["equality_op"]
          type_: unknown
          val_1: string
          val_2: string
        }
        Returns: boolean
      }
      is_visible_through_filters: {
        Args: {
          columns: Database["realtime"]["CompositeTypes"]["wal_column"][]
          filters: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
        }
        Returns: boolean
      }
      list_changes: {
        Args: {
          max_changes: number
          max_record_bytes: number
          publication: unknown
          slot_name: unknown
        }
        Returns: Database["realtime"]["CompositeTypes"]["wal_rls"][]
      }
      quote_wal2json: {
        Args: { entity: unknown }
        Returns: string
      }
      send: {
        Args: { event: string; payload: Json; private?: boolean; topic: string }
        Returns: undefined
      }
      to_regrole: {
        Args: { role_name: string }
        Returns: unknown
      }
      topic: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      action: "INSERT" | "UPDATE" | "DELETE" | "TRUNCATE" | "ERROR"
      equality_op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in"
    }
    CompositeTypes: {
      user_defined_filter: {
        column_name: string | null
        op: Database["realtime"]["Enums"]["equality_op"] | null
        value: string | null
      }
      wal_column: {
        name: string | null
        type_name: string | null
        type_oid: unknown | null
        value: Json | null
        is_pkey: boolean | null
        is_selectable: boolean | null
      }
      wal_rls: {
        wal: Json | null
        is_rls_enabled: boolean | null
        subscription_ids: string[] | null
        errors: string[] | null
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  supabase_functions: {
    Tables: {
      hooks: {
        Row: {
          created_at: string
          hook_name: string
          hook_table_id: number
          id: number
          request_id: number | null
        }
        Insert: {
          created_at?: string
          hook_name: string
          hook_table_id: number
          id?: number
          request_id?: number | null
        }
        Update: {
          created_at?: string
          hook_name?: string
          hook_table_id?: number
          id?: number
          request_id?: number | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          inserted_at: string
          version: string
        }
        Insert: {
          inserted_at?: string
          version: string
        }
        Update: {
          inserted_at?: string
          version?: string
        }
        Relationships: []
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
  vault: {
    Tables: {
      secrets: {
        Row: {
          created_at: string
          description: string
          id: string
          key_id: string | null
          name: string | null
          nonce: string | null
          secret: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      decrypted_secrets: {
        Row: {
          created_at: string | null
          decrypted_secret: string | null
          description: string | null
          id: string | null
          key_id: string | null
          name: string | null
          nonce: string | null
          secret: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decrypted_secret?: never
          description?: string | null
          id?: string | null
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decrypted_secret?: never
          description?: string | null
          id?: string | null
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _crypto_aead_det_decrypt: {
        Args: {
          additional: string
          context?: string
          key_id: number
          message: string
          nonce?: string
        }
        Returns: string
      }
      _crypto_aead_det_encrypt: {
        Args: {
          additional: string
          context?: string
          key_id: number
          message: string
          nonce?: string
        }
        Returns: string
      }
      _crypto_aead_det_noncegen: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_secret: {
        Args: {
          new_description?: string
          new_key_id?: string
          new_name?: string
          new_secret: string
        }
        Returns: string
      }
      update_secret: {
        Args: {
          new_description?: string
          new_key_id?: string
          new_name?: string
          new_secret?: string
          secret_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  _analytics: {
    Enums: {},
  },
  _realtime: {
    Enums: {},
  },
  auth: {
    Enums: {
      aal_level: ["aal1", "aal2", "aal3"],
      code_challenge_method: ["s256", "plain"],
      factor_status: ["unverified", "verified"],
      factor_type: ["totp", "webauthn", "phone"],
      oauth_authorization_status: ["pending", "approved", "denied", "expired"],
      oauth_client_type: ["public", "confidential"],
      oauth_registration_type: ["dynamic", "manual"],
      oauth_response_type: ["code"],
      one_time_token_type: [
        "confirmation_token",
        "reauthentication_token",
        "recovery_token",
        "email_change_token_new",
        "email_change_token_current",
        "phone_change_token",
      ],
    },
  },
  cron: {
    Enums: {},
  },
  extensions: {
    Enums: {},
  },
  graphql: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  net: {
    Enums: {
      request_status: ["PENDING", "SUCCESS", "ERROR"],
    },
  },
  pgbouncer: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  realtime: {
    Enums: {
      action: ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "ERROR"],
      equality_op: ["eq", "neq", "lt", "lte", "gt", "gte", "in"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS"],
    },
  },
  supabase_functions: {
    Enums: {},
  },
  vault: {
    Enums: {},
  },
} as const
