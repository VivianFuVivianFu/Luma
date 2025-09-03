import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UserIdDisplay: React.FC = () => {
  const [userId, setUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || '');
      }
    };
    getUser();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(userId);
    alert('User ID copied to clipboard!');
  };

  if (!userId) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      background: '#f0f8ff', 
      padding: '10px', 
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '300px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 1000
    }}>
      <div><strong>Email:</strong> {userEmail}</div>
      <div><strong>User ID:</strong></div>
      <div style={{ 
        background: '#e6f3e6', 
        padding: '5px', 
        fontFamily: 'monospace', 
        fontSize: '10px',
        wordBreak: 'break-all',
        margin: '5px 0'
      }}>
        {userId}
      </div>
      <button 
        onClick={copyToClipboard}
        style={{
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '10px'
        }}
      >
        Copy ID
      </button>
    </div>
  );
};

export default UserIdDisplay;