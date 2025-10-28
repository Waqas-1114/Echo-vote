'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogOut } from 'lucide-react';
import { ComplaintStatus } from '@/models/interfaces';

interface Officer {
  id: string;
  email: string;
  name?: string;
  employeeId?: string;
  department?: string;
  state?: string;
  district?: string;
}

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

interface Stats {
  total: number;
  assigned: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

export default function OfficerDashboard() {
  const router = useRouter();
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [assignedComplaints, setAssignedComplaints] = useState<ComplaintData[]>([]);
  const [jurisdictionComplaints, setJurisdictionComplaints] = useState<ComplaintData[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, assigned: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    router.push('/auth/login');
  };

  useEffect(() => {
    const fetchData = async () => {
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
        // Fetch officer profile
        const userRes = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setOfficer({
            id: userData.id,
            email: userData.email,
            name: userData.profile?.name,
            employeeId: userData.governmentDetails?.employeeId,
            department: userData.governmentDetails?.department,
            state: userData.profile?.address?.state,
            district: userData.profile?.address?.district,
          });
        }

        let assignedData: ComplaintData[] = [];
        let jurisdictionData: ComplaintData[] = [];
        let statsData = { assigned: 0, pending: 0, inProgress: 0, resolved: 0 };

        // Fetch assigned complaints
        const assignedRes = await fetch('/api/complaints/assigned', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (assignedRes.ok) {
          const data = await assignedRes.json();
          assignedData = data.complaints || [];
          setAssignedComplaints(assignedData);
          statsData = data.stats || { assigned: 0, pending: 0, inProgress: 0, resolved: 0 };
        }

        // Fetch jurisdiction complaints
        const jurisdictionRes = await fetch('/api/complaints/jurisdiction', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (jurisdictionRes.ok) {
          const data = await jurisdictionRes.json();
          jurisdictionData = data.complaints || [];
          setJurisdictionComplaints(jurisdictionData);
        }

        // Calculate total from BOTH assigned and jurisdiction complaints
        const totalComplaints = assignedData.length + jurisdictionData.length;
        console.log('Total Complaints Calculation:', {
          assigned: assignedData.length,
          jurisdiction: jurisdictionData.length,
          total: totalComplaints
        });
        
        setStats({
          total: totalComplaints,
          ...statsData
        });

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!officer) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Officer Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {officer.name || officer.email}
          </p>
          <p className="text-sm text-gray-500">
            Employee ID: {officer.employeeId} | Department: {officer.department || 'Not specified'}
          </p>
          <p className="text-sm text-gray-500">
            Jurisdiction: {officer.district}, {officer.state}
          </p>
        </div>
        
        {/* Logout Button */}
        <Button 
          onClick={handleLogout}
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.assigned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* My Assigned Complaints */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>My Assigned Complaints</CardTitle>
          <CardDescription>
            Complaints directly assigned to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedComplaints.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No assigned complaints</p>
          ) : (
            <div className="space-y-4">
              {assignedComplaints.map((complaint) => (
                <div
                  key={complaint._id.toString()}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{complaint.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      complaint.status === ComplaintStatus.SUBMITTED ? 'bg-yellow-100 text-yellow-800' :
                      complaint.status === ComplaintStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                      complaint.status === ComplaintStatus.RESOLVED ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {complaint.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {complaint.description.substring(0, 150)}...
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(complaint.createdAt).toLocaleDateString()}
                    </span>
                    <Link href={`/complaints/${complaint._id}`}>
                      <Button size="sm" variant="outline">View Details</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          {assignedComplaints.length > 0 && (
            <div className="mt-4 text-center">
              <Link href="/dashboard/officer/my-complaints">
                <Button variant="outline">View All Assigned</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jurisdiction Complaints */}
      <Card>
        <CardHeader>
          <CardTitle>Complaints in My Jurisdiction</CardTitle>
          <CardDescription>
            Unassigned complaints in {officer.district}, {officer.state}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jurisdictionComplaints.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No complaints in your jurisdiction</p>
          ) : (
            <div className="space-y-4">
              {jurisdictionComplaints.map((complaint) => (
                <div
                  key={complaint._id.toString()}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{complaint.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      complaint.status === ComplaintStatus.SUBMITTED ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {complaint.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {complaint.description.substring(0, 150)}...
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Category: {complaint.category}
                    </span>
                    <Link href={`/complaints/${complaint._id}`}>
                      <Button size="sm" variant="outline">View & Assign</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
