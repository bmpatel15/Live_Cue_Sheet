"use client"

import React, { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, SkipForward, Monitor, Smartphone, Tv, FileUp, StopCircle, RotateCcw, Edit2, Check, User as UserIcon, Trash2, X, PlayCircle, PauseCircle, StopCircle as StopCircleIcon, RotateCcw as RotateCcwIcon, SkipForward as SkipForwardIcon, BarChart2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import { doc, onSnapshot, updateDoc, setDoc, collection, query, orderBy, addDoc, getDoc, deleteDoc, getDocs, deleteDoc as firestoreDeleteDoc } from 'firebase/firestore'
import { useFirebase } from '@/contexts/FirebaseContext'
//import AdminPanel from '@/components/AdminPanel'
import { FirebaseError } from 'firebase/app'
import CountdownDisplay from '@/components/CountdownDisplay'

interface Timer {
  id: number
  startTime12: string
  startTime: string
  duration: string
  title: string
  speaker: string
  isRunning: boolean
  remainingTime: number
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  actualDuration: number;
  startedAt: Date | null;
  elapsedTime: number;
}

interface ConnectedDevice {
  id: string
  name: string
  type: 'monitor' | 'smartphone' | 'tv'
  lastSeen: Date
}

interface Message {
  id: string
  text: string
  type: 'info' | 'alert' | 'question'
  timestamp: Date
}

// Update UserRole type
type UserRole = 'admin' | 'user';

/*interface YourStateType {
  title: string;
  timers: Timer[];
  eventProgress: number;
  activeTimer: number;
  totalDuration: number; // Add this line
}
*/
// Add this helper function at the top of your file, outside the component
const calculateActualDuration = (timer: Timer): number => {
  console.log('Calculating actual duration for timer:', timer);
  if (timer.actualStartTime && timer.actualEndTime) {
    const duration = (timer.actualEndTime.getTime() - timer.actualStartTime.getTime()) / 1000;
    console.log('Timer completed, duration:', duration);
    return duration;
  }
  if (timer.actualStartTime && timer.isRunning) {
    const duration = (new Date().getTime() - timer.actualStartTime.getTime()) / 1000;
    console.log('Timer still running, current duration:', duration);
    return duration;
  }
  if (timer.actualStartTime && !timer.isRunning) {
    console.log('Timer paused, elapsed time:', timer.elapsedTime);
    return timer.elapsedTime;
  }
  console.log('Timer not started');
  return 0;
};

export default function StageCueApp() {
  const { auth, firestore } = useFirebase();
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [eventTitle, setEventTitle] = useState("Demo Event: Pawnee Townhall")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [currentTime, setCurrentTime] = useState('13:34')
  const [activeTimer, setActiveTimer] = useState(0)
  const [timers, setTimers] = useState<Timer[]>([])
  // Add the new state variable here
  const [, setIsFirestoreLoaded] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [, setEventProgress] = useState(0)
  const [editingTimer, setEditingTimer] = useState<number | null>(null)
  const intervalRefs = useRef<{ [key: number]: NodeJS.Timeout | null }>({})
  const [, setTotalDuration] = useState(0)
  const [, setElapsedTime] = useState(0)
  const [userRole, setUserRole] = useState<UserRole>('user')
  //const [, setIsAdminPanelOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'alert' | 'question'>('info');
  const countdownWindowRef = useRef<Window | null>(null);
  // Add this new state variable
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  useEffect(() => {
    if (!auth || !firestore) {
      console.log("Firebase not initialized, waiting...");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsLoading(false);
        await fetchUserRole(currentUser.uid);
      } else {
        console.log("No user authenticated, redirecting to login");
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, router]);

  useEffect(() => {
    if (!firestore || !user) return;
    const eventRef = doc(firestore, 'events', 'currentEvent');
    const unsubscribe = onSnapshot(eventRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log("Retrieved data from Firestore:", JSON.stringify(data, null, 2));
        setEventTitle(data.title || "New Event");
        if (data.timers && Array.isArray(data.timers)) {
          setTimers(data.timers.map((timer: Timer) => ({
            id: timer.id,
            startTime12: timer.startTime12,
            startTime: timer.startTime,
            duration: timer.duration,
            title: timer.title,
            speaker: timer.speaker,
            isRunning: timer.isRunning || false,
            remainingTime: timer.remainingTime || durationToSeconds(timer.duration),
            actualStartTime: timer.actualStartTime ? new Date(timer.actualStartTime) : null,
            actualEndTime: timer.actualEndTime ? new Date(timer.actualEndTime) : null,
            actualDuration: timer.actualDuration || 0,
            startedAt: timer.startedAt ? new Date(timer.startedAt) : null,
            elapsedTime: timer.elapsedTime || 0
          })));
        }
        setEventProgress(data.eventProgress || 0);
        setActiveTimer(data.activeTimer || 0);
      } else {
        setEventTitle("New Event");
        setTimers([]);
        setEventProgress(0);
        setActiveTimer(0);
      }
      setIsFirestoreLoaded(true);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  useEffect(() => {
    if (user && firestore) {
      const devicesRef = collection(firestore, 'connectedDevices');
      const q = query(devicesRef, orderBy('lastSeen', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const devices = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ConnectedDevice));
        setConnectedDevices(devices);
      });

      return () => unsubscribe();
    }
  }, [user, firestore]);

  // Add the new useEffect here
  useEffect(() => {
    if (user) {
      const deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        connectDevice(`Device-${Math.random().toString(36).substr(2, 9)}`, 'smartphone')
          .then((newDeviceId) => {
            if (newDeviceId) {
              localStorage.setItem('deviceId', newDeviceId);
              updateDeviceLastSeen(newDeviceId);
            }
          });
      } else {
        updateDeviceLastSeen(deviceId);
        const interval = setInterval(() => {
          updateDeviceLastSeen(deviceId);
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
      }
    }
  }, [user]);

  const fetchUserRole = async (userId: string) => {
    if (!firestore) {
      console.error("Firestore not initialized");
      return;
    }
    try {
      const userRef = doc(firestore, `users/${userId}`);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserRole(userData.role as UserRole);
      } else {
        setUserRole('user'); // Default to 'user' if no role is set
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole('user'); // Default to 'user' on error
    }
  };

  // Update the hasPermission function
  const hasPermission = (action: 'edit' | 'reset' | 'addMessage' | 'viewDevices' | 'upload' | 'adminPanel'): boolean => {
    switch (action) {
      case 'adminPanel':
        return userRole === 'admin';
      case 'edit':
      case 'reset':
      case 'upload':
      case 'addMessage':
      case 'viewDevices':
        return true;
      default:
        return false;
    }
  };

  const navigateToAdminPage = () => {
    router.push('/admin');
  };

  const updateEventData = async (updates: Partial<{ 
    title: string, 
    timers: Timer[], 
    eventProgress: number, 
    activeTimer: number,
    totalDuration: number  // Add this line
  }>) => {
    if (!firestore || !user) return;
    const eventRef = doc(firestore, 'events', 'currentEvent');
    try {
      console.log("Updating Firestore with:", JSON.stringify(updates, null, 2));
      if (updates.timers && updates.timers.length === 0) {
        // If timers array is empty, delete the entire document
        await deleteDoc(eventRef);
      } else {
        // Otherwise, update the document
        await setDoc(eventRef, updates, { merge: true });
      }
      console.log("Firestore update successful");
    } catch (error) {
      console.error("Error updating event data:", error);
    }
  };

  const addMessage = async (message: Omit<Message, 'id'>) => {
    if (user && firestore) {
      const messagesRef = collection(firestore, 'events', 'currentEvent', 'messages');
      await addDoc(messagesRef, message);
    }
  };

  useEffect(() => {
    if (user && firestore) {
      const messagesRef = collection(firestore, 'events', 'currentEvent', 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() // Convert Firestore Timestamp to Date
        } as Message));
        setMessages(fetchedMessages);
        updateCountdownWindow(); // Update the countdown window immediately when messages change
      });

      return () => unsubscribe();
    }
  }, [user, firestore]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    timers.forEach((timer) => {
      if (timer.isRunning) {
        intervalRefs.current[timer.id] = setInterval(() => {
          setTimers((prevTimers) =>
            prevTimers.map((t) =>
              t.id === timer.id
                ? {
                    ...t,
                    elapsedTime: t.elapsedTime + 1,
                    remainingTime: durationToSeconds(t.duration) - t.elapsedTime - 1,
                  }
                : t
            )
          );
          setTotalElapsedTime(prevTotal => prevTotal + 1);
          updateCountdownWindow();
        }, 1000);
      } else if (intervalRefs.current[timer.id]) {
        clearInterval(intervalRefs.current[timer.id]!);
        intervalRefs.current[timer.id] = null;
      }
    });

    return () => {
      Object.values(intervalRefs.current).forEach((interval) => {
        if (interval) clearInterval(interval);
      });
    };
  }, [timers]);

  useEffect(() => {
    const total = timers.reduce((acc, timer) => {
      const [minutes, seconds] = timer.duration.split(':').map(Number)
      return acc + (minutes * 60 + seconds)
    }, 0)
    setTotalDuration(total)

    const elapsed = timers.reduce((acc, timer) => {
      const [minutes, seconds] = timer.duration.split(':').map(Number)
      const timerDuration = minutes * 60 + seconds
      return acc + (timerDuration - timer.remainingTime)
    }, 0)
    setElapsedTime(elapsed)

    const progress = total > 0 ? (elapsed / total) * 100 : 0
    setEventProgress(progress)
  }, [timers])

  const getDeviceIcon = (type: ConnectedDevice['type']) => {
    switch (type) {
      case 'monitor':
        return <Monitor className="h-4 w-4" />
      case 'smartphone':
        return <Smartphone className="h-4 w-4" />
      case 'tv':
        return <Tv className="h-4 w-4" />
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasPermission('upload')) {
      alert("You don't have permission to upload a new cue sheet.");
      return;
    }
    const file = event.target.files?.[0]
    if (file) {
      // Reset all data without confirmation when uploading a new cue sheet
      await resetAllWithoutConfirmation();

      const reader = new FileReader()
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][]

        // Find the indices of the required columns
        const headers = jsonData[0].map(String);
        const timeIndex = headers.findIndex(h => /time/i.test(h));
        const durationIndex = headers.findIndex(h => /duration/i.test(h));
        const cueNameIndex = headers.findIndex(h => /(cue|item)/i.test(h));
        const presenterIndex = headers.findIndex(h => /(presenter|speaker)/i.test(h));

        if (timeIndex === -1 || durationIndex === -1 || cueNameIndex === -1) {
          alert("Required columns (Time, Duration, Cue Name) not found in the cue sheet.");
          return;
        }

        const newTimers: Timer[] = jsonData.slice(1).map((row, index) => {
          const startTime24 = convertTo24Hour(row[timeIndex]);
          const duration = convertExcelDuration(row[durationIndex]?.toString() || '');
          return {
            id: index + 1,
            startTime12: formatTo12Hour(startTime24),
            startTime: startTime24,
            duration: duration,
            title: row[cueNameIndex]?.toString() || '',
            speaker: presenterIndex !== -1 ? row[presenterIndex]?.toString() || '' : '',
            isRunning: false,
            remainingTime: durationToSeconds(duration),
            actualDuration: 0,
            startedAt: null,
            actualStartTime: null,
            actualEndTime: null,
            elapsedTime: 0
          };
        });

        setTimers(newTimers);
        try {
          await updateEventData({ 
            title: "New Event", // Set a default title for the new event
            timers: newTimers,
            eventProgress: 0,
            activeTimer: 0
          });
        } catch (error) {
          console.error("Error updating event data:", error);
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  // New function to reset all data without confirmation
  const resetAllWithoutConfirmation = async () => {
    setTimers([]);
    setEventTitle("New Event");
    setActiveTimer(0);
    setEventProgress(0);
    setMessages([]); // Reset messages
    await updateEventData({
      title: "New Event",
      timers: [],
      eventProgress: 0,
      activeTimer: 0
    });
    await deleteAllMessages();
  };

  const convertTo24Hour = (time: string | number | undefined | null): string => {
    if (time === undefined || time === null) return '';

    if (typeof time === 'number') {
      const totalSeconds = Math.round(time *24 * 60 * 60);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    if (typeof time === 'string') {
    const [timePart, modifier] = time.split(' ')
      if (!timePart || !modifier) return time
      const [hours, minutes] = timePart.split(':')
      if (!hours || !minutes) return time
      let hoursNum = parseInt(hours, 10)
      const minutesNum = parseInt(minutes, 10)
      if (isNaN(hoursNum) || isNaN(minutesNum)) return time
      if (modifier.toLowerCase() === 'pm' && hoursNum < 12) {
      hoursNum += 12
    } else if (modifier.toLowerCase() === 'am' && hoursNum === 12) {
      hoursNum = 0
    }
    return `${hoursNum.toString().padStart(2, '0')}:${minutesNum.toString().padStart(2, '0')}`;
  }

    return '';
  };

  const formatTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time24;
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const convertExcelDuration = (duration: string): string => {
    if (!duration) return ''
    const parts = duration.split(':')
    if (parts.length !== 3) return duration
    const [hours, minutes, seconds] = parts.map(part => parseInt(part, 10))
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return duration
    const totalMinutes = hours * 60 + minutes
    return `${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const durationToSeconds = (duration: string): number => {
    const [minutes, seconds] = duration.split(':').map(Number);
    return minutes * 60 + seconds;
  }

  // Add the new function here
  const calculateEventProgress = (timers: Timer[]): number => {
    const totalPlannedDuration = timers.reduce((acc, timer) => acc + durationToSeconds(timer.duration), 0);
    const totalActualDuration = timers.reduce((acc, timer) => acc + calculateActualDuration(timer), 0);
    return (totalActualDuration / totalPlannedDuration) * 100;
  };

  // Update the startTimer function
  const startTimer = async (id: number) => {
    const updatedTimers = timers.map(timer => {
      if (timer.id === id) {
        const now = new Date();
        console.log(`Starting timer ${id}`, { now });
        return {
          ...timer,
          isRunning: true,
          actualStartTime: timer.actualStartTime || now,
          startedAt: now,
          elapsedTime: timer.elapsedTime || 0
        };
      }
      return timer;
    });
    setTimers(updatedTimers);
    await updateEventData({ timers: updatedTimers });
  };

  // Update the pauseTimer function
  const pauseTimer = async (id: number) => {
    const updatedTimers = timers.map(timer => {
      if (timer.id === id) {
        const now = new Date();
        const elapsedSinceStart = timer.startedAt ? (now.getTime() - timer.startedAt.getTime()) / 1000 : 0;
        const totalElapsed = timer.elapsedTime + elapsedSinceStart;
        console.log(`Pausing timer ${id}`, { now, elapsedSinceStart, totalElapsed });
        return {
          ...timer,
          isRunning: false,
          elapsedTime: totalElapsed,
          startedAt: null
        };
      }
      return timer;
    });
    setTimers(updatedTimers);
    await updateEventData({ timers: updatedTimers });
  };

  // Update the stopTimer function
  const stopTimer = async (id: number) => {
    const updatedTimers = timers.map(timer => {
      if (timer.id === id) {
        const now = new Date();
        const elapsedSinceStart = timer.startedAt ? (now.getTime() - timer.startedAt.getTime()) / 1000 : 0;
        const totalElapsed = timer.elapsedTime + elapsedSinceStart;
        console.log(`Stopping timer ${id}`, { now, elapsedSinceStart, totalElapsed });
        return {
          ...timer,
          isRunning: false,
          remainingTime: durationToSeconds(timer.duration),
          elapsedTime: totalElapsed,
          startedAt: null,
          actualEndTime: now,
          actualDuration: totalElapsed
        };
      }
      return timer;
    });
    setTimers(updatedTimers);
    await updateEventData({ timers: updatedTimers });
  };

  // Update the nextCue function
  const nextCue = async (id: number) => {
    const currentIndex = timers.findIndex(timer => timer.id === id);
    if (currentIndex === -1) return;

    const updatedTimers = timers.map((timer, index) => {
      if (index === currentIndex) {
        const now = new Date();
        const elapsedSinceStart = timer.startedAt ? (now.getTime() - timer.startedAt.getTime()) / 1000 : 0;
        const totalElapsed = timer.elapsedTime + elapsedSinceStart;
        console.log(`Ending current timer ${id}`, { now, elapsedSinceStart, totalElapsed });
        return {
          ...timer,
          isRunning: false,
          remainingTime: 0,
          elapsedTime: totalElapsed,
          startedAt: null,
          actualEndTime: now,
          actualDuration: totalElapsed
        };
      }
      if (index === currentIndex + 1) {
        const now = new Date();
        console.log(`Starting next timer ${timer.id}`, { now });
        return {
          ...timer,
          isRunning: true,
          actualStartTime: now,
          startedAt: now,
          elapsedTime: 0
        };
      }
      return timer;
    });

    setTimers(updatedTimers);
    setActiveTimer(currentIndex + 1);
    const newEventProgress = calculateEventProgress(updatedTimers);
    setEventProgress(newEventProgress);
    await updateEventData({ timers: updatedTimers, eventProgress: newEventProgress, activeTimer: currentIndex + 1 });
  };

  const formatTime = (time: number): string => {
    const absTime = Math.abs(time);
    const minutes = Math.floor(absTime / 60);
    const seconds = Math.floor(absTime % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleEditTimer = (id: number) => {
    setEditingTimer(id);
  };

  const handleTimerChange = (id: number, field: keyof Timer, value: string) => {
    setTimers((prevTimers) =>
      prevTimers.map((timer) => {
        if (timer.id === id) {
          const updatedTimer = { ...timer, [field]: value };
          if (field === 'startTime12') {
            updatedTimer.startTime = convertTo24Hour(value);
          } else if (field === 'duration') {
            // Allow any input, but format it when saving
            updatedTimer.duration = value;
          }
          return updatedTimer;
        }
        return timer;
      })
    );
  };

  const handleSaveTimer = async () => {
    setEditingTimer(null);
    
    const updatedTimers = [...timers];
    let currentStartTime = updatedTimers[0].startTime;
    let newTotalDuration = 0;
    
    for (let i = 0; i < updatedTimers.length; i++) {
      const timer = updatedTimers[i];
      timer.startTime = currentStartTime;
      timer.startTime12 = formatTo12Hour(currentStartTime);
      
      // Format the duration when saving
      if (timer.duration) {
        const [minutes, seconds] = timer.duration.replace(/[^0-9:]/g, '').split(':').map(Number);
        timer.duration = `${minutes || 0}:${seconds ? seconds.toString().padStart(2, '0') : '00'}`;
        timer.remainingTime = (minutes || 0) * 60 + (seconds || 0);
        newTotalDuration += timer.remainingTime;
      }
      
      if (i < updatedTimers.length - 1) {
        currentStartTime = calculateNewStartTime(currentStartTime, timer.duration);
      }
    }

    setTimers(updatedTimers);
    setTotalDuration(newTotalDuration);

    // Recalculate event progress
    const newEventProgress = calculateEventProgress(updatedTimers);
    setEventProgress(newEventProgress);

    await updateEventData({ 
      timers: updatedTimers, 
      eventProgress: newEventProgress,
      totalDuration: newTotalDuration,
      activeTimer: activeTimer  // Add this line to include the current active timer
    });
  };

  // Update the renderProgressBar function
  const renderProgressBar = () => {
    const totalPlannedDuration = timers.reduce((acc, timer) => acc + durationToSeconds(timer.duration), 0);
    const totalRemainingTime = Math.max(0, totalPlannedDuration - totalElapsedTime);
    const totalCompletedPercentage = (totalElapsedTime / totalPlannedDuration) * 100;

    const segments = timers.map((timer, index) => {
      const plannedDuration = durationToSeconds(timer.duration);
      const segmentWidth = (plannedDuration / totalPlannedDuration) * 100;
      const segmentProgress = Math.min(100, (timer.elapsedTime / plannedDuration) * 100);

      return (
        <div key={timer.id} className="h-full relative" style={{ width: `${segmentWidth}%` }}>
          <div 
            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-1000 ease-linear" 
            style={{ width: `${segmentProgress}%` }}
          ></div>
          {index < timers.length - 1 && (
            <div className="absolute top-0 right-0 w-0.5 h-full bg-white"></div>
          )}
        </div>
      );
    });

    return (
      <div className="mt-6">
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-red-600 font-medium">Elapsed: {formatTime(Math.round(totalElapsedTime))}</span>
          <span className="text-green-600 font-medium">Completed: {totalCompletedPercentage.toFixed(1)}%</span>
          <span className="text-red-600 font-medium">Remaining: {formatTime(Math.round(totalRemainingTime))}</span>
        </div>
        <div className="bg-gray-300 h-2 rounded-full overflow-hidden flex">
          {segments}
        </div>
      </div>
    );
  };

  const handleLogout = async () => {
    if (!auth) {
      console.error('Auth is not initialized');
      return;
    }
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setEventTitle(newTitle);
  };

  const handleTitleSave = async () => {
    setIsEditingTitle(false);
    await updateEventData({ title: eventTitle });
  };

  const connectDevice = async (name: string, type: ConnectedDevice['type']) => {
    if (!firestore) {
      console.error('Firestore is not initialized.');
      return;
    }
    const devicesRef = collection(firestore, 'connectedDevices');
    const docRef = await addDoc(devicesRef, {
      name,
      type,
      lastSeen: new Date()
    });
    return docRef.id;
  };

  const disconnectDevice = async (id: string) => {
    if (!firestore) {
      console.error('Firestore is not initialized.');
      return;
    }
    const deviceRef = doc(firestore, 'connectedDevices', id);
    await deleteDoc(deviceRef);
  };

  // Add the new function here
  const updateDeviceLastSeen = async (id: string | null) => {
    if (!id || !firestore) return; // Exit if id is null or firestore is not initialized
    const deviceRef = doc(firestore, 'connectedDevices', id);
    try {
      await updateDoc(deviceRef, {
        lastSeen: new Date()
      });
    } catch (error) {
      if ((error as FirebaseError).code === 'not-found') {
        // If the document doesn't exist, create it
        await setDoc(deviceRef, {
          name: `Device-${id}`,
          type: 'smartphone', // Default type
          lastSeen: new Date()
        });
      } else {
        console.error("Error updating device last seen:", error);
      }
    }
  };

  const handleAddMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const message = {
        text: newMessage.trim(),
        type: messageType,
        timestamp: new Date()
      };
      await addMessage(message);
      setNewMessage('');
    }
  };

  // Keep the first resetAll function as is
  const resetAll = async () => {
    if (!hasPermission('reset')) {
      alert("You don't have permission to reset all data.");
      return;
    }
    if (confirm("Are you sure you want to reset all data? This action cannot be undone.")) {
      setTimers([]);
      setEventTitle("New Event");
      setActiveTimer(0);
      setEventProgress(0);
      setMessages([]); // Reset messages
      await updateEventData({
        title: "New Event",
        timers: [],
        eventProgress: 0,
        activeTimer: 0
      });
      await deleteAllMessages(); // New function to delete all messages in Firestore
    }
  };

  // Rename this function to resetAllTimers
  const resetAllTimers = async () => {
    const resetTimers = timers.map(timer => ({
      ...timer,
      isRunning: false,
      remainingTime: durationToSeconds(timer.duration),
      actualStartTime: null,
      actualEndTime: null,
      actualDuration: 0,
      startedAt: null,
      elapsedTime: 0
    }));

    setTimers(resetTimers);
    setActiveTimer(0);
    setEventProgress(0);
    setTotalElapsedTime(0);

    // Clear all intervals
    Object.values(intervalRefs.current).forEach((interval) => {
      if (interval) clearInterval(interval);
    });
    intervalRefs.current = {};

    // Update Firestore
    await updateEventData({
      timers: resetTimers,
      activeTimer: 0,
      eventProgress: 0
    });

    // Update the countdown window
    updateCountdownWindow();
  };

  // Add this new function to delete all messages
  const deleteAllMessages = async () => {
    if (user && firestore) {
      const messagesRef = collection(firestore, 'events', 'currentEvent', 'messages');
      const snapshot = await getDocs(messagesRef);
      const deletePromises = snapshot.docs.map(doc => firestoreDeleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }
  };

  // Add this new function to delete a single message
  const deleteMessage = async (messageId: string) => {
    if (user && firestore) {
      const messageRef = doc(firestore, 'events', 'currentEvent', 'messages', messageId);
      await firestoreDeleteDoc(messageRef);
    }
  };

  const calculateNewStartTime = (previousEndTime: string, duration: string): string => {
    const [prevHours, prevMinutes] = previousEndTime.split(':').map(Number);
    const [durationMinutes] = duration.split(':').map(Number);
    
    let newMinutes = prevMinutes + durationMinutes;
    let newHours = prevHours + Math.floor(newMinutes / 60);
    newMinutes %= 60;
    newHours %= 24;

    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const openCountdownInNewWindow = () => {
    const countdownWindow = window.open('/countdown', 'Countdown Timer', 'width=1000,height=800');
    if (countdownWindow) {
      countdownWindowRef.current = countdownWindow;
      updateCountdownWindow();
    }
  };

  // Update the updateCountdownWindow function
  const updateCountdownWindow = () => {
    if (countdownWindowRef.current && !countdownWindowRef.current.closed) {
      const currentActiveTimer = timers[activeTimer];
      countdownWindowRef.current.postMessage({
        type: 'UPDATE_COUNTDOWN',
        data: {
          title: currentActiveTimer?.title || '',
          speaker: currentActiveTimer?.speaker || '',
          remainingTime: currentActiveTimer?.remainingTime || 0,
          isRunning: currentActiveTimer?.isRunning || false,
          isUnder60Seconds: (currentActiveTimer?.remainingTime || 0) > 0 && (currentActiveTimer?.remainingTime || 0) <= 60,
          isOvertime: (currentActiveTimer?.remainingTime || 0) <= 0,
          currentTime: currentTime,
          messages: messages // Send the full messages array
        }
      }, '*');
    }
  };

  // Update the useEffect for timers to call updateCountdownWindow more frequently
  useEffect(() => {
    const intervalId = setInterval(() => {
      updateCountdownWindow();
    }, 100); // Update every 100ms

    return () => clearInterval(intervalId);
  }, [timers, activeTimer, messages]);

  // Add these new functions
  const playAll = async () => {
    const updatedTimers = timers.map((timer, index) => ({
      ...timer,
      isRunning: index === activeTimer,
      remainingTime: index === activeTimer ? timer.remainingTime : durationToSeconds(timer.duration),
    }));
    setTimers(updatedTimers);
    const newEventProgress = calculateEventProgress(updatedTimers);
    setEventProgress(newEventProgress);
    await updateEventData({ timers: updatedTimers, eventProgress: newEventProgress });
  };

  const pauseAll = async () => {
    const updatedTimers = timers.map(timer => ({ ...timer, isRunning: false }));
    setTimers(updatedTimers);
    const newEventProgress = calculateEventProgress(updatedTimers);
    setEventProgress(newEventProgress);
    await updateEventData({ timers: updatedTimers, eventProgress: newEventProgress });
  };

  const stopAll = async () => {
    const updatedTimers = timers.map(timer => ({
      ...timer,
      isRunning: false,
      remainingTime: durationToSeconds(timer.duration),
    }));
    setTimers(updatedTimers);
    setActiveTimer(0);
    setEventProgress(0);
    await updateEventData({ timers: updatedTimers, activeTimer: 0, eventProgress: 0 });
  };

  const nextAll = async () => {
    if (activeTimer < timers.length - 1) {
      const updatedTimers = timers.map((timer, index) => {
        if (index === activeTimer) {
          return { ...timer, isRunning: false, remainingTime: 0 };
        } else if (index === activeTimer + 1) {
          return { ...timer, isRunning: true, remainingTime: durationToSeconds(timer.duration) };
        }
        return timer;
      });
      const newActiveTimer = activeTimer + 1;
      setTimers(updatedTimers);
      setActiveTimer(newActiveTimer);
      const newEventProgress = calculateEventProgress(updatedTimers);
      setEventProgress(newEventProgress);
      await updateEventData({ timers: updatedTimers, activeTimer: newActiveTimer, eventProgress: newEventProgress });
    }
  };

  // Update the exportAnalytics function
  const exportAnalytics = () => {
    const workbook = XLSX.utils.book_new();
    const worksheetData = timers.map((timer, index) => {
      const plannedDuration = durationToSeconds(timer.duration);
      const actualDuration = calculateActualDuration(timer);
      const difference = actualDuration - plannedDuration;
      let status = 'Not Started';
      if (actualDuration > 0) {
        status = difference > 0 ? 'Over' : difference < 0 ? 'Early' : 'On Time';
      }

      console.log(`Timer ${index + 1}:`, {
        plannedDuration,
        actualDuration,
        difference,
        status,
        actualStartTime: timer.actualStartTime,
        actualEndTime: timer.actualEndTime,
        isRunning: timer.isRunning,
        elapsedTime: timer.elapsedTime
      });

      return {
        'Cue Number': index + 1,
        'Start Time': timer.startTime12,
        'Cue Name': timer.title,
        'Presenter': timer.speaker,
        'Planned Duration': timer.duration,
        'Actual Duration': formatTime(Math.round(actualDuration)),
        'Difference': formatTime(Math.abs(Math.round(difference))),
        'Status': status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cue Analytics');

    // Add summary data
    const totalPlannedDuration = timers.reduce((acc, timer) => acc + durationToSeconds(timer.duration), 0);
    const totalActualDuration = timers.reduce((acc, timer) => acc + calculateActualDuration(timer), 0);
    const totalDifference = totalActualDuration - totalPlannedDuration;

    const summaryData = [
      { 'Summary': 'Total Planned Duration', 'Value': formatTime(Math.round(totalPlannedDuration)) },
      { 'Summary': 'Total Actual Duration', 'Value': formatTime(Math.round(totalActualDuration)) },
      { 'Summary': 'Total Difference', 'Value': formatTime(Math.abs(Math.round(totalDifference))) },
      { 'Summary': 'Overall Status', 'Value': totalDifference > 0 ? 'Over' : totalDifference < 0 ? 'Early' : 'On Time' },
    ];

    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    XLSX.writeFile(workbook, 'cue_analytics.xlsx');
  };

  // Add this function near the other timer-related functions
  const resetTimer = async (id: number) => {
    const updatedTimers = timers.map(timer => {
      if (timer.id === id) {
        return {
          ...timer,
          isRunning: false,
          remainingTime: durationToSeconds(timer.duration),
          actualStartTime: null,
          actualEndTime: null,
          actualDuration: 0,
          startedAt: null,
          elapsedTime: 0
        };
      }
      return timer;
    });

    setTimers(updatedTimers);

    // Clear the interval for this timer if it exists
    if (intervalRefs.current[id]) {
      clearInterval(intervalRefs.current[id]!);
      intervalRefs.current[id] = null;
    }

    // Recalculate event progress
    const newEventProgress = calculateEventProgress(updatedTimers);
    setEventProgress(newEventProgress);

    // Update Firestore
    await updateEventData({ 
      timers: updatedTimers, 
      eventProgress: newEventProgress
    });

    // Update the countdown window
    updateCountdownWindow();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-2 sm:p-4">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6">
          {isEditingTitle ? (
            <Input
              value={eventTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleTitleSave}
              onKeyPress={(e) => e.key === 'Enter' && handleTitleSave()}
              className="text-xl sm:text-2xl font-bold mb-2 sm:mb-0"
              autoFocus
            />
          ) : (
            <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-0 flex items-center">
              {eventTitle}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingTitle(true)}
                className="ml-2"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </h1>
          )}
          <div className="flex items-center space-x-2">
            <div className="flex items-center mr-4">
              <UserIcon className="h-4 w-4 mr-2" />
              <span className="text-sm">{user?.email}</span>
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                userRole === 'admin' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {userRole}
              </span>
            </div>
            {hasPermission('adminPanel') && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs sm:text-sm bg-white text-gray-900 hover:bg-gray-100"
                onClick={navigateToAdminPage}
              >
                ADMIN
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs sm:text-sm bg-white text-gray-900 hover:bg-gray-100">
              Menu
            </Button>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm bg-white text-gray-900 hover:bg-gray-100">
              Profile
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs sm:text-sm bg-white text-gray-900 hover:bg-gray-100"
              onClick={handleLogout}
            >
              Logout
            </Button>
            {hasPermission('reset') && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs sm:text-sm bg-white text-red-600 hover:bg-red-100"
                onClick={resetAll}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <CountdownDisplay
            activeTimerData={timers[activeTimer]}
            currentTime={currentTime}
            isRunning={timers[activeTimer]?.isRunning || false}
            isUnder60Seconds={(timers[activeTimer]?.remainingTime || 0) > 0 && (timers[activeTimer]?.remainingTime || 0) <= 60}
            isOvertime={(timers[activeTimer]?.remainingTime || 0) <= 0}
            formatTime={formatTime}
            openCountdownInNewWindow={openCountdownInNewWindow}
          />

          {/* Connected Devices Card */}
          <Card className="bg-white text-gray-900">
            <CardContent className="p-4 h-full">
              <h3 className="text-lg font-semibold mb-3">Connected Devices <span className="text-sm font-normal text-gray-600">{connectedDevices.length}</span></h3>
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 4rem)' }}>
                {connectedDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getDeviceIcon(device.type)}
                      <span className="ml-2 text-sm">{device.name}</span>
                    </div>
                    {hasPermission('edit') && (
                      <Button variant="ghost" size="sm" onClick={() => disconnectDevice(device.id)}>
                        Disconnect
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {hasPermission('edit') && (
                <Button className="w-full mt-4 text-sm" onClick={() => connectDevice('New Device', 'smartphone')}>
                  Connect New Device
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Messages Card */}
          <Card className="bg-white text-gray-900">
            <CardContent className="p-4 h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-3">Messages</h3>
              <div className="overflow-y-auto flex-grow mb-4" style={{ maxHeight: '300px' }}>
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div key={message.id} className={`p-2 rounded relative ${
                      message.type === 'alert' ? 'bg-red-600' : 
                      message.type === 'question' ? 'bg-green-600' : 'bg-gray-700'
                    }`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 text-white hover:bg-red-700"
                        onClick={() => deleteMessage(message.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <p className="text-sm font-medium text-white">{message.text}</p>
                      <p className="text-xs text-gray-300 mt-1">
                        {message.timestamp.toLocaleString()}
                      </p>
                      <div className="flex flex-wrap justify-end space-x-1 mt-1">
                        <Button variant="ghost" size="sm" className="text-xs px-1.5 py-0.5 text-white">A</Button>
                        <Button variant="ghost" size="sm" className="text-xs px-1.5 py-0.5 text-white">A</Button>
                        <Button variant="ghost" size="sm" className="text-xs px-1.5 py-0.5 text-white">B</Button>
                        <Button variant="ghost" size="sm" className="text-xs px-1.5 py-0.5 text-white">aA</Button>
                        <Button variant="ghost" size="sm" className="text-xs px-1.5 py-0.5 text-white">Show</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {hasPermission('addMessage') && (
                <form onSubmit={handleAddMessage} className="mt-auto">
                  <div className="flex space-x-2 mb-2">
                    <Button
                      type="button"
                      onClick={() => setMessageType('info')}
                      variant={messageType === 'info' ? 'default' : 'outline'}
                      size="sm"
                    >
                      Info
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setMessageType('alert')}
                      variant={messageType === 'alert' ? 'default' : 'outline'}
                      size="sm"
                    >
                      Alert
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setMessageType('question')}
                      variant={messageType === 'question' ? 'default' : 'outline'}
                      size="sm"
                    >
                      Question
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-grow"
                    />
                    <Button type="submit">Send</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Master Control Buttons */}
          <div className="lg:col-span-3 mb-4">
            <div className="flex justify-center space-x-4">
              <Button onClick={playAll} variant="outline" size="lg">
                <PlayCircle className="h-6 w-6" />
              </Button>
              <Button onClick={pauseAll} variant="outline" size="lg">
                <PauseCircle className="h-6 w-6" />
              </Button>
              <Button onClick={stopAll} variant="outline" size="lg">
                <StopCircleIcon className="h-6 w-6" />
              </Button>
              <Button onClick={resetAllTimers} variant="outline" size="lg">
                <RotateCcwIcon className="h-6 w-6" />
              </Button>
              <Button onClick={nextAll} variant="outline" size="lg">
                <SkipForwardIcon className="h-6 w-6" />
              </Button>
              {/* Add the Export Analytics button here */}
              <Button onClick={exportAnalytics} variant="outline" size="lg" className="bg-blue-500 text-white hover:bg-blue-600">
                <BarChart2 className="h-6 w-6 mr-2" />
                Export Analytics
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="lg:col-span-3">
            {renderProgressBar()}
          </div>

          {/* Timers Card */}
          <div className="lg:col-span-3">
            <Card className="bg-white text-gray-900 mt-4">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <h2 className="text-xl font-semibold mb-2 sm:mb-0">Timers</h2>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm bg-gray-200 text-gray-900 hover:bg-gray-300">
                      Blackout
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm bg-gray-200 text-gray-900 hover:bg-gray-300">
                      Flash
                    </Button>
                    <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300">
                      <FileUp className="h-4 w-4 mr-2" />
                      Upload Cue Sheet
                      <input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="sr-only" />
                    </label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs sm:text-sm bg-white text-red-600 hover:bg-red-100"
                      onClick={resetAll}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Reset All
                    </Button>
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-30rem)]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white">
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <th className="px-2 py-3">Time</th>
                          <th className="px-2 py-3">Duration</th>
                          <th className="px-2 py-3">Cue Name</th>
                          <th className="px-2 py-3">Presenter</th>
                          <th className="px-2 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {timers.map((timer, index) => {
                          const isActive = index === activeTimer;
                          const isUnder60Seconds = timer.remainingTime < 60 && timer.isRunning;
                          const rowClassName = isActive && timer.isRunning
                            ? isUnder60Seconds
                              ? 'bg-red-100'
                              : 'bg-green-100'
                            : index % 2 === 0
                            ? 'bg-gray-50'
                            : '';

                          return (
                            <tr key={timer.id} className={rowClassName}>
                              <td className="px-2 py-4 whitespace-nowrap">
                                {editingTimer === timer.id ? (
                                  <Input
                                    value={timer.startTime12}
                                    onChange={(e) => handleTimerChange(timer.id, 'startTime12', e.target.value)}
                                    className="w-24"
                                  />
                                ) : (
                                  timer.startTime12
                                )}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap">
                                {editingTimer === timer.id ? (
                                  <Input
                                    value={timer.duration}
                                    onChange={(e) => handleTimerChange(timer.id, 'duration', e.target.value)}
                                    onBlur={() => {
                                      // Format on blur for better user experience
                                      const [minutes, seconds] = timer.duration.replace(/[^0-9:]/g, '').split(':').map(Number);
                                      const formattedDuration = `${minutes || 0}:${seconds ? seconds.toString().padStart(2, '0') : '00'}`;
                                      handleTimerChange(timer.id, 'duration', formattedDuration);
                                    }}
                                    className="w-24"
                                    placeholder="MM:SS"
                                  />
                                ) : (
                                  timer.duration
                                )}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap">
                                {editingTimer === timer.id ? (
                                  <Input
                                    value={timer.title}
                                    onChange={(e) => handleTimerChange(timer.id, 'title', e.target.value)}
                                    className="w-full"
                                  />
                                ) : (
                                  timer.title
                                )}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap">
                                {editingTimer === timer.id ? (
                                  <Input
                                    value={timer.speaker}
                                    onChange={(e) => handleTimerChange(timer.id, 'speaker', e.target.value)}
                                    className="w-full"
                                  />
                                ) : (
                                  timer.speaker
                                )}
                              </td>
                              <td className="px-2 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                  <Button variant="ghost" size="sm" onClick={() => resetTimer(timer.id)}>
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => timer.isRunning ? pauseTimer(timer.id) : startTimer(timer.id)}>
                                    {timer.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => stopTimer(timer.id)}>
                                    <StopCircle className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => nextCue(timer.id)}>
                                    <SkipForward className="h-4 w-4" />
                                  </Button>
                                  {editingTimer === timer.id ? (
                                    <Button variant="ghost" size="sm" onClick={() => handleSaveTimer()}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="sm" onClick={() => handleEditTimer(timer.id)}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <span className={`text-sm font-medium ${
                                    isActive && timer.isRunning
                                      ? isUnder60Seconds
                                        ? 'text-red-600'
                                        : 'text-green-600'
                                      : ''
                                  }`}>
                                    {formatTime(timer.remainingTime)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
