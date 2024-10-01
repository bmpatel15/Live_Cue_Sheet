"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/contexts/FirebaseContext';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const { auth, firestore, signInWithGoogle } = useFirebase();

  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithGoogle();
      await handleAuthSuccess(result);
    } catch (error) {
      console.error("Google authentication failed:", error);
      // Handle error (e.g., show error message to user)
    }
  };

  const handleAuthSuccess = async (userCredential: UserCredential) => {
    const user = userCredential.user;
    if (!firestore) {
      console.error("Firestore not initialized");
      return;
    }
    const userRef = doc(firestore, `users/${user.uid}`);
    const userSnap = await getDoc(userRef);
    
    let userRole = 'user'; // Default role

    if (!userSnap.exists()) {
      // Create new user document
      await setDoc(userRef, {
        email: user.email,
        role: userRole
      });
    } else {
      userRole = userSnap.data().role || 'user';
    }
    
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('isAuthenticated', 'true');
    
    router.push('/stage-cue');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
      console.error("Firebase not initialized");
      return;
    }
    try {
      let userCredential: UserCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      await handleAuthSuccess(userCredential);
    } catch (error) {
      console.error(`${isLogin ? 'Login' : 'Sign up'} failed:`, error);
      // Handle error (e.g., show error message to user)
    }
  };

  /*const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      console.error("Auth is not initialized");
      return;
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful", result);
      // Redirect or update state as needed
      router.push('/stage-cue');
    } catch (error) {
      console.error("Login error:", error);
      // Handle the error (e.g., show an error message to the user)
    }
  };
*/
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? 'Login' : 'Create Account'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full">
              {isLogin ? 'Log in' : 'Sign up'}
            </Button>
          </form>
          <Button 
            variant="link" 
            className="w-full mt-4"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Create an account' : 'Back to login'}
          </Button>
          <div className="mt-4 space-y-2">
            <Button onClick={handleGoogleAuth} className="w-full">
              Sign in with Google
            </Button>
            {!isLogin && (
              <Button onClick={handleGoogleAuth} className="w-full">
                Sign up with Google
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}