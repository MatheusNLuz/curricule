-- Account deletion retains a disabled identity marker to prevent external login
-- from recreating an account whose materials were deleted.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_status_check";
ALTER TABLE "User" ADD CONSTRAINT "User_status_check"
  CHECK ("status" IN ('ACTIVE', 'SUSPENDED', 'DELETED'));
