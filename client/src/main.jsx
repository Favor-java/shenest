import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { apolloClient } from './graphql/client.js';
import './styles.css';

// ApolloProvider makes the GraphQL client available to every React page.
// BrowserRouter handles navigation without refreshing the browser.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
);
