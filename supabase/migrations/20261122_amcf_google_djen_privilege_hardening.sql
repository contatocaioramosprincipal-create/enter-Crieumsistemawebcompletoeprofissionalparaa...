-- Supabase concede privilégios default a roles públicas; restringir explicitamente novas tabelas do AMCF.
revoke all on table
 public.amcf_djen_publications,
 public.amcf_djen_syncs,
 public.amcf_google_connections,
 public.amcf_google_oauth_states,
 public.amcf_google_calendar_events,
 public.amcf_google_email_messages,
 public.amcf_google_sent_messages,
 public.amcf_google_digest_settings
 from public, anon;
revoke all on table public.amcf_google_oauth_states from authenticated;
grant all on table
 public.amcf_djen_publications,
 public.amcf_djen_syncs,
 public.amcf_google_connections,
 public.amcf_google_oauth_states,
 public.amcf_google_calendar_events,
 public.amcf_google_email_messages,
 public.amcf_google_sent_messages,
 public.amcf_google_digest_settings
 to service_role;
grant select on public.amcf_djen_publications,public.amcf_djen_syncs,
 public.amcf_google_connections,public.amcf_google_email_messages,
 public.amcf_google_sent_messages to authenticated;
grant select,insert,update on public.amcf_google_calendar_events,
 public.amcf_google_digest_settings to authenticated;