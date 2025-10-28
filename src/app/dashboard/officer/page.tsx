'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ComplaintStatus,
  ComplaintPriority,
  AdminLevel
} from '@/models/interfaces';

interface OfficerProfile {
  name: string;
  designation: string;
  department: string;
  employeeId: string;
  adminLevel: AdminLevel;
  jurisdiction: {
    name: string;
    level: string;
  };
}

interface Complaint {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  location: {
    state: string;
    district: string;
    block?: string;
    address?: string;
  };
  assignedTo: {
    division: {
      name: string;
    };
    department: string;
    officers: Array<{
      _id: string;
      profile: { name: string };
      governmentDetails: { designation: string };
    }>;
  };
  submittedBy: {
    userId?: string;
    anonymousId?: string;
  };
  publicSupport: {
    upvotes: number;
  };
  createdAt: string;
  updatedAt: string;
  daysOpen: number;
}

interface AreaComplaint {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  department: string;
  assignedOfficer: string;
  designation: string;
  daysOpen: number;
}

interface SubordinateTask {
  complaint: Complaint;
  subordinate: {
    name: string;
    designation: string;
    employeeId: string;
  };
  assignedDate: string;
  lastUpdate: string;
  progress: string;
}

export default function OfficerDashboard() {
  const [profile, setProfile] = useState<OfficerProfile | null>(null);
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [areaComplaints, setAreaComplaints] = useState<AreaComplaint[]>([]);
  const [subordinateTasks, setSubordinateTasks] = useState<SubordinateTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assigned' | 'area' | 'subordinates' | 'analytics'>('assigned');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updateMessage, setUpdateMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/auth/login';
        return;
      }

      // Fetch officer profile first to check admin level
      const profileRes = await fetch('/api/officer/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile);

        // Redirect based on admin level
        if (data.profile.adminLevel === AdminLevel.STATE) {
          window.location.href = '/dashboard/officer/state';
          return;
        } else if (data.profile.adminLevel === AdminLevel.DISTRICT) {
          window.location.href = '/dashboard/officer/district';
          return;
        }
      }

      // Fetch complaints assigned to me
      const myComplaintsRes = await fetch('/api/officer/my-complaints', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (myComplaintsRes.ok) {
        const data = await myComplaintsRes.json();
        setMyComplaints(data.complaints);
      }

      // Fetch complaints in my area
      const areaComplaintsRes = await fetch('/api/officer/area-complaints', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (areaComplaintsRes.ok) {
        const data = await areaComplaintsRes.json();
        setAreaComplaints(data.complaints);
      }

      // Fetch subordinate tasks
      const subordinatesRes = await fetch('/api/officer/subordinate-tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subordinatesRes.ok) {
        const data = await subordinatesRes.json();
        setSubordinateTasks(data.tasks);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (complaintId: string, newStatus: ComplaintStatus, comments: string) => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/officer/complaints/${complaintId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, comments })
      });

      if (response.ok) {
        fetchDashboardData();
        setSelectedComplaint(null);
        setUpdateMessage('');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotifyCitizen = async (complaintId: string, message: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/officer/complaints/${complaintId}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });
      alert('Citizen notified successfully');
    } catch (error) {
      console.error('Error notifying citizen:', error);
    }
  };

  const getStatusColor = (status: ComplaintStatus) => {
    const colors = {
      [ComplaintStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
      [ComplaintStatus.ACKNOWLEDGED]: 'bg-yellow-100 text-yellow-800',
      [ComplaintStatus.IN_PROGRESS]: 'bg-orange-100 text-orange-800',
      [ComplaintStatus.ESCALATED]: 'bg-purple-100 text-purple-800',
      [ComplaintStatus.RESOLVED]: 'bg-green-100 text-green-800',
      [ComplaintStatus.CLOSED]: 'bg-gray-100 text-gray-800',
      [ComplaintStatus.REJECTED]: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: ComplaintPriority) => {
    const colors = {
      [ComplaintPriority.LOW]: 'text-green-600',
      [ComplaintPriority.MEDIUM]: 'text-yellow-600',
      [ComplaintPriority.HIGH]: 'text-orange-600',
      [ComplaintPriority.CRITICAL]: 'text-red-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <h2 className="text-xl font-bold mb-4">Access Denied</h2>
          <p className="mb-4">You don't have access to the officer dashboard.</p>
          <Button onClick={() => window.location.href = '/auth/login'}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  const stats = {
    totalAssigned: myComplaints.length,
    pending: myComplaints.filter(c =>
      c.status === ComplaintStatus.SUBMITTED ||
      c.status === ComplaintStatus.ACKNOWLEDGED
    ).length,
    inProgress: myComplaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length,
    resolved: myComplaints.filter(c => c.status === ComplaintStatus.RESOLVED).length,
    critical: myComplaints.filter(c => c.priority === ComplaintPriority.CRITICAL).length,
    subordinateTasks: subordinateTasks.length,
    areaComplaints: areaComplaints.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Officer Dashboard</h1>
              <p className="text-gray-600">{profile.name} - {profile.designation}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{profile.department}</p>
              <p className="text-sm text-gray-500">{profile.employeeId}</p>
              <Button
                onClick={() => {
                  localStorage.removeItem('token');
                  window.location.href = '/auth/login';
                }}
                variant="outline"
                className="mt-2"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Assigned to Me</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalAssigned}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Pending Action</div>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">In Progress</div>
            <div className="text-3xl font-bold text-orange-600">{stats.inProgress}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Critical Priority</div>
            <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-2 font-medium ${activeTab === 'assigned'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            My Assigned Complaints ({stats.totalAssigned})
          </button>
          <button
            onClick={() => setActiveTab('area')}
            className={`px-4 py-2 font-medium ${activeTab === 'area'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Area Overview ({stats.areaComplaints})
          </button>
          <button
            onClick={() => setActiveTab('subordinates')}
            className={`px-4 py-2 font-medium ${activeTab === 'subordinates'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Subordinate Tasks ({stats.subordinateTasks})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium ${activeTab === 'analytics'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Analytics
          </button>
        </div>

        {/* Assigned Complaints Tab - Content shown in next message due to length */}
        {activeTab === 'assigned' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Complaints Assigned to Me</h2>
            </div>

            {myComplaints.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-600">No complaints assigned to you yet.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myComplaints.map(complaint => (
                  <Card key={complaint.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-mono text-sm text-gray-500">
                            #{complaint.ticketNumber}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                            {complaint.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span className={`font-medium ${getPriorityColor(complaint.priority)}`}>
                            {complaint.priority.toUpperCase()} PRIORITY
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {complaint.title}
                        </h3>
                        <p className="text-gray-600 mb-3">{complaint.description.substring(0, 150)}...</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>📍 {complaint.location.district}, {complaint.location.state}</span>
                          <span>📁 {complaint.category}</span>
                          <span>⏱️ {complaint.daysOpen} days open</span>
                          <span>👍 {complaint.publicSupport.upvotes} support</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setSelectedComplaint(complaint)}
                        size="sm"
                      >
                        Update Status
                      </Button>
                      <Button
                        onClick={() => {
                          const msg = prompt('Enter message to send to citizen:');
                          if (msg) handleNotifyCitizen(complaint.id, msg);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Notify Citizen
                      </Button>
                      <Button
                        onClick={() => window.location.href = `/complaints/${complaint.id}`}
                        variant="outline"
                        size="sm"
                      >
                        View Details
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Remaining tabs in continuation... */}
      </div>
    </div>
  );
}
