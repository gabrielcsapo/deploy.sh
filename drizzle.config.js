export default {
  schema: './server/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.deploy-data/deploy.db',
  },
};
