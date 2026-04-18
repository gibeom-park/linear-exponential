import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { installApiFetchInterceptor } from './lib/apiFetch.ts';
import { queryClient } from './lib/queryClient.ts';
import { router } from './router.ts';
import './styles/globals.css';

installApiFetchInterceptor();

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
