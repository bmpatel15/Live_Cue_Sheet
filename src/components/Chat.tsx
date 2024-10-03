import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/contexts/FirebaseContext';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
}

interface ChatProps {
  receiverId: string;
  receiverName: string;
  onClose: () => void;
}

export default function Chat({ receiverId, receiverName, onClose }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { firestore, currentUser } = useFirebase();

  useEffect(() => {
    if (!firestore || !currentUser) return;

    const chatQuery = query(
      collection(firestore, 'chats'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const fetchedMessages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage))
        .filter(msg => 
          (msg.senderId === currentUser.uid && msg.receiverId === receiverId) ||
          (msg.senderId === receiverId && msg.receiverId === currentUser.uid)
        );
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [firestore, currentUser, receiverId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !firestore || !currentUser) return;

    await addDoc(collection(firestore, 'chats'), {
      senderId: currentUser.uid,
      receiverId: receiverId,
      content: newMessage.trim(),
      timestamp: new Date()
    });

    setNewMessage('');
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white shadow-lg rounded-lg flex flex-col">
      <div className="p-4 bg-gray-100 rounded-t-lg flex justify-between items-center">
        <h3 className="font-semibold">{receiverName}</h3>
        <Button onClick={onClose} variant="ghost" size="sm">Close</Button>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`mb-2 ${msg.senderId === currentUser?.uid ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg ${msg.senderId === currentUser?.uid ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {msg.content}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow mr-2"
          />
          <Button type="submit">Send</Button>
        </div>
      </form>
    </div>
  );
}