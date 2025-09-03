import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LandingPage from '../components/LandingPage';
import Dashboard from '../components/Dashboard';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);

  // Helper function to ensure user profile exists
  async function ensureUserProfile(user: any) {
    try {
      // First check if profile already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, create it
      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        } else {
          console.log('User profile created successfully for:', user.email);
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  }

  useEffect(() => {
    let isMounted = true;

    // Check for existing session with improved error handling
    const checkSession = async () => {
      try {
        // Get the current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // If session retrieval fails, try to refresh
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          if (refreshedSession?.user && isMounted) {
            setIsAuthenticated(true);
            setUserEmail(refreshedSession.user.email || '');
            setShowDashboard(true);
            console.log('Session refreshed successfully for returning user');
          }
        } else if (session?.user && isMounted) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || '');
          setShowDashboard(true);
          console.log('Existing session found - auto-logging in user');
        }
      } catch (error) {
        console.error('Error during session check:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // Listen for auth state changes with improved handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');

        if (event === 'SIGNED_IN' || (event === 'TOKEN_REFRESHED' && session?.user)) {
          setIsAuthenticated(true);
          setUserEmail(session?.user?.email || '');
          setShowDashboard(true);
          
          // Ensure user profile exists for OAuth users
          if (event === 'SIGNED_IN' && session?.user) {
            await ensureUserProfile(session.user);
          }
          
          console.log('User authenticated:', session?.user?.email);
        } else if (event === 'SIGNED_OUT' || !session?.user) {
          setIsAuthenticated(false);
          setUserEmail('');
          setShowDashboard(false);
          console.log('User signed out or session expired');
        }
        
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = () => {
    setShowDashboard(true);
  };

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local state
      setIsAuthenticated(false);
      setUserEmail('');
      setShowDashboard(false);
      
      console.log('User successfully logged out');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear local state even if Supabase logout fails
      setIsAuthenticated(false);
      setUserEmail('');
      setShowDashboard(false);
    }
  };

  const handleBackToHome = () => {
    setShowDashboard(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Luma...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated || !showDashboard ? (
        <LandingPage onAuthSuccess={handleAuthSuccess} />
      ) : (
        <Dashboard 
          userEmail={userEmail} 
          onLogout={handleLogout}
          onBackToHome={handleBackToHome}
        />
      )}
    </>
  );
};

export default Index;