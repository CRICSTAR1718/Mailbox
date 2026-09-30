import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { reportError } from './errorBus.js';
import './index.css';

// Failed API calls surface as toasts. Queries/mutations that show their own inline error set meta: { silent: true },
// and mutations with their own onError handler report for themselves.
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (!query.meta?.silent) reportError(`Couldn’t load your mail: ${error.message}`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (!mutation.options.onError && !mutation.meta?.silent) reportError(error.message);
    },
  }),
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary variant="page">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
