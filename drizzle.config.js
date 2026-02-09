export default {
  schema: './server/schema.js',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.deploy-data/deploy.db',
  },
};
