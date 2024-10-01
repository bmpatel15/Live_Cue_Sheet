"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

interface FirebaseContextType {
    app: FirebaseApp | null;
    auth: Auth | null;
    firestore: Firestore | null;
    signInWithGoogle: () => Promise<UserCredential>;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export const useFirebase = () => {
    const context = useContext(FirebaseContext);
    if (!context) {
        throw new Error('useFirebase must be used within a FirebaseProvider');
    }
    return context;
};

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [app, setApp] = useState<FirebaseApp | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null);
    const [firestore, setFirestore] = useState<Firestore | null>(null);

    useEffect(() => {
        console.log("Firebase Config:", {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        });

        if (!getApps().length) {
            const firebaseConfig = {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            };
            try {
                const app = initializeApp(firebaseConfig);
                setApp(app);
                const authInstance = getAuth(app);
                setAuth(authInstance);
                setFirestore(getFirestore(app));
                console.log("Firebase initialized successfully");
            } catch (error) {
                console.error("Error initializing Firebase:", error);
            }
        }
    }, []);

    const signInWithGoogle = async () => {
        console.log("Attempting to sign in with Google");
        if (!auth) {
            console.error("Auth is not initialized");
            return Promise.reject("Auth is not initialized");
        }
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            console.log("Sign in successful", result);
            return result;
        } catch (error) {
            console.error("Error signing in with Google:", error);
            throw error;
        }
    };

    return (
        <FirebaseContext.Provider value={{ app, auth, firestore, signInWithGoogle }}>
            {children}
        </FirebaseContext.Provider>
    );
};