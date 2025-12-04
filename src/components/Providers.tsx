'use client';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { FoldersProvider } from '@/contexts/FoldersContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { UsersProvider } from '@/contexts/UsersContext';
import { SearchProvider } from '@/contexts/SearchContext';
import { ConfirmDialogProvider } from '@/contexts/ConfirmDialogContext';
import { FullscreenProvider } from '@/contexts/FullscreenContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FullscreenProvider>
        <ConfirmDialogProvider>
          <UsersProvider>
            <AuthProvider>
              <FoldersProvider>
                <CategoriesProvider>
                  <SearchProvider>
                    {children}
                  </SearchProvider>
                </CategoriesProvider>
              </FoldersProvider>
            </AuthProvider>
          </UsersProvider>
        </ConfirmDialogProvider>
      </FullscreenProvider>
    </ThemeProvider>
  );
}

