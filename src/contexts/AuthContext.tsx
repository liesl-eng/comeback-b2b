import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const CODE_STORAGE_KEY = "cbg_access_code";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isApproved: boolean;
  approvalLoading: boolean;
  refreshApproval: () => Promise<void>;
  /** Verify an access code without requiring an account; stores it locally to unlock pricing. */
  unlockWithCode: (code: string) => Promise<boolean>;
  /** Clear the locally stored access code. */
  clearLocalCode: () => void;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readLocalCode = (): string | null => {
  try {
    return localStorage.getItem(CODE_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userApproved, setUserApproved] = useState(false);
  const [codeApproved, setCodeApproved] = useState<boolean>(() => !!readLocalCode());
  const [approvalLoading, setApprovalLoading] = useState(false);

  const checkApproval = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setUserApproved(false);
      return;
    }
    setApprovalLoading(true);
    try {
      const { data, error } = await supabase.rpc("is_approved", { _user_id: uid });
      setUserApproved(!error && data === true);
    } finally {
      setApprovalLoading(false);
    }
  }, []);

  // When a user signs in/up, if they have a previously verified code in localStorage,
  // automatically link it to their account so they can place orders.
  const linkLocalCodeToUser = useCallback(async (uid: string | undefined) => {
    if (!uid) return;
    const code = readLocalCode();
    if (!code) return;
    try {
      const { data } = await supabase.rpc("redeem_access_code", { _code: code });
      if (data === true) {
        await checkApproval(uid);
      }
    } catch {
      // ignore
    }
  }, [checkApproval]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Defer to avoid deadlocks
        setTimeout(() => {
          checkApproval(session?.user?.id);
          linkLocalCodeToUser(session?.user?.id);
        }, 0);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      checkApproval(session?.user?.id);
      linkLocalCodeToUser(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [checkApproval, linkLocalCodeToUser]);

  const refreshApproval = useCallback(async () => {
    await checkApproval(user?.id);
  }, [checkApproval, user?.id]);

  const unlockWithCode = useCallback(async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;
    // If signed in, redeem (records redemption). Otherwise just verify.
    if (user?.id) {
      const { data, error } = await supabase.rpc("redeem_access_code", { _code: trimmed });
      if (error || data !== true) return false;
      try { localStorage.setItem(CODE_STORAGE_KEY, trimmed); } catch { /* ignore */ }
      setCodeApproved(true);
      await checkApproval(user.id);
      return true;
    }
    const { data, error } = await supabase.rpc("verify_access_code", { _code: trimmed });
    if (error || data !== true) return false;
    try { localStorage.setItem(CODE_STORAGE_KEY, trimmed); } catch { /* ignore */ }
    setCodeApproved(true);
    return true;
  }, [user?.id, checkApproval]);

  const clearLocalCode = useCallback(() => {
    try { localStorage.removeItem(CODE_STORAGE_KEY); } catch { /* ignore */ }
    setCodeApproved(false);
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserApproved(false);
    // Keep the local code so they can still browse prices after signing out.
  };

  const isApproved = userApproved || codeApproved;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isApproved,
        approvalLoading,
        refreshApproval,
        unlockWithCode,
        clearLocalCode,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
