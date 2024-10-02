import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/contexts/FirebaseContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface User {
  id: string;
  email: string;
  role: 'admin' | 'program_director' | 'user';
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const { firestore, userRole } = useFirebase();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      if (!firestore) throw new Error("Firestore is not initialized");
      const usersCollection = collection(firestore, 'users');
      const userSnapshot = await getDocs(usersCollection);
      const userList = userSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: 'admin' | 'program_director' | 'user') => {
    if (userRole !== 'admin') {
      console.error("Only admins can change user roles");
      return;
    }

    let newRole: 'admin' | 'program_director' | 'user';
    switch (currentRole) {
      case 'admin':
        newRole = 'program_director';
        break;
      case 'program_director':
        newRole = 'user';
        break;
      case 'user':
        newRole = 'program_director';
        break;
    }

    try {
      if (!firestore) throw new Error("Firestore is not initialized");
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ) as User[]);
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            {/* Add more tabs here for other admin functions */}
          </TabsList>
          <TabsContent value="users">
            <h2 className="text-lg font-semibold mb-4">User Management</h2>
            {users.map((user) => (
              <div key={user.id} className="flex justify-between items-center my-2 p-2 bg-gray-100 rounded">
                <span>{user.email} - {user.role}</span>
                <Button onClick={() => toggleUserRole(user.id, user.role)}>
                  {user.role === 'admin' ? 'Demote to Program Director' : 
                   user.role === 'program_director' ? 'Demote to User' : 'Promote to Program Director'}
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}