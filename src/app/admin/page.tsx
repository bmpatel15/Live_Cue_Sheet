"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import AdminPanel from '@/components/AdminPanel';
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Button onClick={() => router.push('/stage-cue')}>Back to Stage Cue</Button>
        </div>
        <AdminPanel />
      </div>
    </div>
  );
}