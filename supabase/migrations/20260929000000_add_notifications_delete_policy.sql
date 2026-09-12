-- Notifications should not accumulate once read: reading one (web bell,
-- mobile Alertas) now deletes it instead of just flagging read_at. That
-- requires each user to be able to delete their own notification rows,
-- which had no delete policy until now.

create policy notifications_delete_own
  on public.notifications
  for delete
  to authenticated
  using (recipient_id = auth.uid());

-- One-time cleanup: remove already-read notifications that piled up
-- under the old "mark read, keep forever" behavior.
delete from public.notifications where read_at is not null;
