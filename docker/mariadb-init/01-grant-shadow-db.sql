-- Prisma Migrate creates a temporary "shadow database" during `prisma migrate dev`.
-- The app user therefore needs CREATE/DROP on the server in development.
-- This runs once when the volume is first created. Development only.
GRANT ALL PRIVILEGES ON *.* TO 'study'@'%';
FLUSH PRIVILEGES;
