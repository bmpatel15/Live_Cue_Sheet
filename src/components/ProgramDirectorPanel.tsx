import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/contexts/FirebaseContext';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Event {
    id: string;
    title: string;
}

export default function ProgramDirectorPanel() {
  const [events, setEvents] = useState<Event[]>([]);
  const { firestore } = useFirebase();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      if (!firestore) throw new Error("Firestore is not initialized");
      const eventsCollection = collection(firestore, 'events');
      const eventSnapshot = await getDocs(eventsCollection);
      const eventList: Event[] = eventSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title
      }));
      setEvents(eventList);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Director Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <h2 className="text-lg font-semibold mb-4">Event Management</h2>
        {events.map((event) => (
          <div key={event.id} className="flex justify-between items-center my-2 p-2 bg-gray-100 rounded">
            <span>{event.title}</span>
            <Button onClick={() => {/* Handle event edit */}}>
              Edit Event
            </Button>
          </div>
        ))}
        <Button onClick={() => {/* Handle new event creation */}} className="mt-4">
          Create New Event
        </Button>
      </CardContent>
    </Card>
  );
}