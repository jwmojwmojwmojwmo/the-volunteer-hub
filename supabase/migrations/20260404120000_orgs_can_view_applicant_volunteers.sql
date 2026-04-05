do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'volunteers'
      and policyname = 'Organizations can view applicant volunteers'
  ) then
    create policy "Organizations can view applicant volunteers"
      on public.volunteers
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.event_applications ea
          join public.events e on e.id = ea.event_id
          where ea.volunteer_id = volunteers.id
            and e.org_id = auth.uid()
        )
      );
  end if;
end
$$;
