import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { getUserFromRequest } from './utils/auth.js';

const app = express();
const port = process.env.PORT || 4000;

// Apollo Server handles GraphQL queries and mutations.
const graphqlServer = new ApolloServer({ typeDefs, resolvers });
await graphqlServer.start();

app.use(
  '/graphql',
  cors(),
  express.json(),
  expressMiddleware(graphqlServer, {
    // Context is created for every GraphQL request.
    // Resolvers can use context.user to know who is logged in.
    context: async ({ req }) => ({ user: getUserFromRequest(req) }),
  }),
);

app.get('/health', (_, response) => {
  response.json({ ok: true, message: 'SheNest API is healthy' });
});

app.listen(port, () => {
  console.log(`SheNest API running on http://localhost:${port}/graphql`);
});
