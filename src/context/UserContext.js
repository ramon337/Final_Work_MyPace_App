// src/context/UserContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [crewData, setCrewData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshCrewData = async () => {
    if (!crewData) {
      setLoading(true);
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setCrewData(null);
      setLoading(false);
      return;
    }

    const fetchCrew = async () => {
      const { data: memberData } = await supabase
        .from('crew_members')
        // 🚀 FIX: 'is_public' toegevoegd aan de select query!
        .select('crews(id, name, total_minutes, invite_code, current_streak, rest_day_tokens, created_at, is_public)')
        .eq('user_id', user.id)
        .single();
      return memberData;
    };

    let memberData = await fetchCrew();

    // De wacht-loop voor nieuwe accounts (Race Condition)
    let attempts = 0;
    while (!memberData && attempts < 3) {
      await new Promise(resolve => setTimeout(resolve, 800));
      memberData = await fetchCrew();
      attempts++;
    }

    if (memberData && memberData.crews) {
      setCrewData(memberData.crews);
    } else {
      setCrewData(null);
    }
    
    // Altijd aan het eind de loading uitzetten
    setLoading(false);
  };

  useEffect(() => {
    refreshCrewData();

    // Luister mee met inloggen en uitloggen
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCrewData(null);
      } else if (event === 'SIGNED_IN') {
        refreshCrewData(); 
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ crewData, loading, refreshCrewData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);