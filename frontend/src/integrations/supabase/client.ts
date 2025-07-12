
// Legacy Supabase client - now using API services instead
// This file is kept for compatibility but all functionality has been moved to API services

export const supabase = {
  // Placeholder to prevent import errors
  auth: {
    signUp: () => { throw new Error('Use authService instead'); },
    signInWithPassword: () => { throw new Error('Use authService instead'); },
    signOut: () => { throw new Error('Use authService instead'); },
    onAuthStateChange: () => { throw new Error('Use authService instead'); },
    getSession: () => { throw new Error('Use authService instead'); }
  },
  from: () => { throw new Error('Use specific API services instead'); }
};
