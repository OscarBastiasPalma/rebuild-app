import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import env from '../config';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSession();
    }, []);

    const loadSession = async () => {
        try {
            const sessionData = await AsyncStorage.getItem('session');
            if (sessionData) {
                setSession(JSON.parse(sessionData));
            }
        } catch (error) {
            console.error('Error loading session:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSession = async (newSession) => {
        try {
            await AsyncStorage.setItem('session', JSON.stringify(newSession));
            setSession(newSession);
        } catch (error) {
            console.error('Error saving session:', error);
        }
    };

    const clearSession = async () => {
        try {
            await AsyncStorage.removeItem('session');
            setSession(null);
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    };

    return (
        <SessionContext.Provider value={{ session, loading, updateSession, clearSession }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
}; 