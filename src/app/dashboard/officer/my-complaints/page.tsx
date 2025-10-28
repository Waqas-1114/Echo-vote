'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ComplaintStatus } from '@/models/interfaces';

interface ComplaintData {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: ComplaintStatus;
  location: {
    state: string;
    district: string;
  };
  createdAt: string;
}

export default function MyComplaints() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<ComplaintData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        router.push('/auth/login');
        return;
      }

      try {
        const user = JSON.parse(userStr);
        
        // Check if user is a government officer
        if (user.userType !== 'government_officer') {
          router.push('/auth/login');
          return;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/auth/login');
        return;
      }

      try {
        const res = await fetch('/api/complaints/assigned', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setComplaints(data.complaints || []);
        }
      } catch (error) {
        console.error('Error fetching complaints:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [router]);

  const pendingCount = complaints.filter(c => c.status === ComplaintStatus.SUBMITTED).length;
  const inProgressCount = complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length;
  const resolvedCount = complaints.filter(c => c.status === ComplaintStatus.RESOLVED).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/officer">
          <Button variant="outline" size="sm">← Back to Dashboard</Button>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">My Assigned Complaints</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant="outline" size="sm">All ({complaints.length})</Button>
        <Button variant="outline" size="sm">
          Pending ({pendingCount})
        </Button>
        <Button variant="outline" size="sm">
          In Progress ({inProgressCount})
        </Button>
        <Button variant="outline" size="sm">
          Resolved ({resolvedCount})
        </Button>
      </div>

      <div className="space-y-4">
        {complaints.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-gray-500">No complaints assigned to you yet</p>
            </CardContent>
          </Card>
        ) : (
          complaints.map((complaint) => (
            <Card key={complaint._id.toString()}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="mb-2">{complaint.title}</CardTitle>
                    <div className="flex gap-2 text-sm text-gray-600 flex-wrap">
                      <span>Category: {complaint.category}</span>
                      <span>•</span>
                      <span>{complaint.location.district}, {complaint.location.state}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${
                    complaint.status === ComplaintStatus.SUBMITTED ? 'bg-yellow-100 text-yellow-800' :
                    complaint.status === ComplaintStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                    complaint.status === ComplaintStatus.RESOLVED ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {complaint.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{complaint.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Submitted: {new Date(complaint.createdAt).toLocaleDateString()}
                  </span>
                  <Link href={`/complaints/${complaint._id}`}>
                    <Button>Manage Complaint</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
