"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
//import { useFirebase } from '@/contexts/FirebaseContext'
//import { onAuthStateChanged } from 'firebase/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    console.log('Home page: Checking authentication...')
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
    console.log('Home page: Is authenticated:', isAuthenticated)

    if (isAuthenticated) {
      console.log('Home page: Redirecting to stage-cue')
      router.replace('/stage-cue')
    } else {
      console.log('Home page: Redirecting to login')
      router.replace('/login')
    }
  }, [router])

  return <div>Loading...</div>
}

