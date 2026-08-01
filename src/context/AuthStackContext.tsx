'use client';

import { createContext, useContext } from 'react';

export const AuthStackContext = createContext(false);

export function useAuthStackMounted() {
  return useContext(AuthStackContext);
}
