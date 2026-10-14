-- Migração original: migration_20260930_012405000
update public.amcf_members set role = 'admin', status = 'active' where id = '8fe33846-dff9-4023-89df-180acfdb8977';