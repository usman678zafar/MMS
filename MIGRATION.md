# MongoDB to Neon PostgreSQL migration

The application runtime now uses Neon PostgreSQL through Drizzle ORM. MongoDB is retained only as a source for backup and migration tools.

## Cutover

1. Create a Neon database and copy its pooled connection string.
2. Keep the old MongoDB connection string as `MONGODB_URL` and set the Neon string as `POSTGRES_URL` in `.env`.
3. Stop application writes during the final backup/import window.
4. Run:

   ```powershell
   npm run db:backup:mongo
   npm run db:backup:verify -- .\backups\mongodb-YYYY-MM-DD...
   npm run db:migrate
   npm run db:import:mongo -- .\backups\mongodb-YYYY-MM-DD...
   npm run admin:sync
   npm test
   npm run build
   ```

The import is transactional and idempotent. MongoDB ObjectIds are converted to deterministic UUIDs, and `migration_id_map` preserves every source-to-target identity. Existing R2 URLs and object keys are copied as JSON metadata; the R2 objects themselves are not moved.

Do not remove `MONGODB_URL` or the verified backup until record counts and the application have been validated after cutover.
