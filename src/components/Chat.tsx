import React, { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/contexts/FirebaseContext';
import { collection, addDoc, query, orderBy, onSnapshot, where, Timestamp, DocumentData } from 'firebase/firestore';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  timestamp: Timestamp;
  participants: string;
}

interface ChatProps {
  receiverId: string;
  receiverName: string;
  receiverUserId: string;
  onClose: () => void;
}

export default function Chat({ receiverId, receiverName, receiverUserId, onClose }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { firestore, currentUser } = useFirebase();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!firestore || !currentUser) return;

    // Create a compound query to get only relevant messages
    const chatQuery = query(
      collection(firestore, 'chats'),
      where('participants', '==', [currentUser.uid, receiverId].sort().join('_')),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp : Timestamp.fromDate(data.timestamp)
        } as ChatMessage;
      });
      setMessages(fetchedMessages);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [firestore, currentUser, receiverId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !firestore || !currentUser) return;
  
    setIsLoading(true);
    try {
      const messageData = {
        senderId: currentUser.uid,
        senderName: currentUser.email,
        receiverId: receiverUserId, // Use receiverUserId instead of receiverId
        content: newMessage.trim(),
        timestamp: Timestamp.now(),
        participants: [currentUser.uid, receiverUserId].sort().join('_')
      };
  
      console.log('Sending message:', messageData);
      
      await addDoc(collection(firestore, 'chats'), messageData);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white shadow-lg rounded-lg flex flex-col">
      <div className="p-3 bg-gray-100 rounded-t-lg flex justify-between items-center border-b">
        <h3 className="font-semibold text-sm">{receiverName}</h3>
        <Button onClick={onClose} variant="ghost" size="sm">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-2 rounded-lg ${
                msg.senderId === currentUser?.uid
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200'
              }`}
            >
              <p className="text-sm break-words">{msg.content}</p>
              <span className="text-xs opacity-75 block mt-1">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}