-- =====================================================================
-- Bag number becomes optional: not every deposit has a printed bag ID.
-- NULLs are distinct in the (bag_number, deposit_date) unique constraint,
-- so many un-numbered deposits per day are allowed while real numbers stay unique.
-- The existing length check passes for NULL; blanks are normalised to NULL.
-- inventory_items is kept (older rows + mobile-app compatibility) but no longer collected on the web form.
-- =====================================================================
alter table public.participants alter column bag_number drop not null;

update public.participants set bag_number = null where bag_number is not null and trim(bag_number) = '';
