'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    MessageSquare,
    Plus,
    Search,
    Filter,
    User,
    LogOut,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    TrendingUp,
    FileText,
    MapPin
} from 'lucide-react';
import { ComplaintStatus, ComplaintPriority } from '@/models/interfaces';

interface Complaint {
    _id: string;
    ticketNumber: string;
    title: string;
    description: string;
    category: string;
    status: ComplaintStatus;
    priority: ComplaintPriority;
    location: {
        state: string;
        district: string;
        address?: string;
    };
    createdAt: string;
    updatedAt: string;
    publicSupport: {
        upvotes: number;
        comments: Array<{
            comment: string;
            submittedAt: string;
        }>;
    };
}

interface User {
    id: string;
    email: string;
    userType: string;
    profile: {
        name?: string;
        address: {
            state: string;
            district: string;
        };
    };
    isAnonymous?: boolean;
}

export default function CitizenDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
    });

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/auth/login');
            return;
        }

        try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            fetchComplaints(token);
        } catch (error) {
            console.error('Error parsing user data:', error);
            router.push('/auth/login');
        }
    }, [router]);

    const fetchComplaints = async (token: string) => {
        try {
            const response = await fetch('/api/complaints/my-complaints', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch complaints');
            }

            const data = await response.json();
            setComplaints(data.complaints || []);

            // Calculate stats
            const total = data.complaints?.length || 0;
            const pending = data.complaints?.filter((c: Complaint) => c.status === ComplaintStatus.SUBMITTED).length || 0;
            const inProgress = data.complaints?.filter((c: Complaint) =>
                [ComplaintStatus.ACKNOWLEDGED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.ESCALATED].includes(c.status)
            ).length || 0;
            const resolved = data.complaints?.filter((c: Complaint) => c.status === ComplaintStatus.RESOLVED).length || 0;

            setStats({ total, pending, inProgress, resolved });
        } catch (error) {
            console.error('Error fetching complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const getStatusIcon = (status: ComplaintStatus) => {
        switch (status) {
            case ComplaintStatus.SUBMITTED:
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case ComplaintStatus.ACKNOWLEDGED:
            case ComplaintStatus.IN_PROGRESS:
                return <AlertCircle className="w-4 h-4 text-blue-500" />;
            case ComplaintStatus.RESOLVED:
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case ComplaintStatus.REJECTED:
                return <XCircle className="w-4 h-4 text-red-500" />;
            case ComplaintStatus.ESCALATED:
                return <TrendingUp className="w-4 h-4 text-orange-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: ComplaintStatus) => {
        switch (status) {
            case ComplaintStatus.SUBMITTED:
                return 'bg-yellow-100 text-yellow-800';
            case ComplaintStatus.ACKNOWLEDGED:
            case ComplaintStatus.IN_PROGRESS:
                return 'bg-blue-100 text-blue-800';
            case ComplaintStatus.RESOLVED:
                return 'bg-green-100 text-green-800';
            case ComplaintStatus.REJECTED:
                return 'bg-red-100 text-red-800';
            case ComplaintStatus.ESCALATED:
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: ComplaintPriority) => {
        switch (priority) {
            case ComplaintPriority.HIGH:
                return 'bg-red-100 text-red-800';
            case ComplaintPriority.MEDIUM:
                return 'bg-yellow-100 text-yellow-800';
            case ComplaintPriority.LOW:
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredComplaints = complaints.filter(complaint => {
        const matchesSearch = complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            complaint.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <Link href="/" className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-gray-900">EchoVote</span>
                            </Link>
                            <span className="text-gray-600 text-sm">Citizen Dashboard</span>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <User className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-700">
                                    {user?.profile?.name || user?.email || 'Anonymous User'}
                                </span>
                            </div>
                            <Button onClick={handleLogout} variant="outline" size="sm">
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Welcome back, {user?.profile?.name || 'Citizen'}!
                        </h1>
                        <p className="text-gray-600">
                            Track your complaints and submit new ones for your area: {user?.profile?.address?.district}, {user?.profile?.address?.state}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => router.push('/complaints/submit')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Submit Complaint
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Complaints</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                                </div>
                                <FileText className="w-8 h-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                                </div>
                                <Clock className="w-8 h-8 text-yellow-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">In Progress</p>
                                    <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                                </div>
                                <AlertCircle className="w-8 h-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Resolved</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                    <Link href="/complaints/submit">
                        <Button className="flex items-center space-x-2">
                            <Plus className="w-4 h-4" />
                            <span>Submit New Complaint</span>
                        </Button>
                    </Link>

                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search complaints..."
                                className="pl-10 w-full sm:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <select
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value={ComplaintStatus.SUBMITTED}>Submitted</option>
                            <option value={ComplaintStatus.ACKNOWLEDGED}>Acknowledged</option>
                            <option value={ComplaintStatus.IN_PROGRESS}>In Progress</option>
                            <option value={ComplaintStatus.RESOLVED}>Resolved</option>
                            <option value={ComplaintStatus.REJECTED}>Rejected</option>
                            <option value={ComplaintStatus.ESCALATED}>Escalated</option>
                        </select>
                    </div>
                </div>

                {/* Complaints List */}
                <div className="space-y-4">
                    {filteredComplaints.length > 0 ? (
                        filteredComplaints.map((complaint) => (
                            <Card key={complaint._id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                        {complaint.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        Ticket: {complaint.ticketNumber}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    {getStatusIcon(complaint.status)}
                                                </div>
                                            </div>

                                            <p className="text-gray-700 mb-3 line-clamp-2">
                                                {complaint.description}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                                                    {complaint.status.replace(/_/g, ' ')}
                                                </span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                                                    {complaint.priority} Priority
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {complaint.category}
                                                </span>
                                            </div>

                                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                                                <div className="flex items-center space-x-1">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{complaint.location.district}, {complaint.location.state}</span>
                                                </div>
                                                <span>
                                                    Created: {new Date(complaint.createdAt).toLocaleDateString()}
                                                </span>
                                                <span>
                                                    {complaint.publicSupport.upvotes} upvotes
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <Link href={`/complaints/${complaint._id}`}>
                                                <Button variant="outline" size="sm">
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {searchTerm || statusFilter !== 'all' ? 'No complaints found' : 'No complaints yet'}
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {searchTerm || statusFilter !== 'all'
                                        ? 'Try adjusting your search or filter criteria.'
                                        : "You haven't submitted any complaints yet. Start by submitting your first complaint."
                                    }
                                </p>
                                {!searchTerm && statusFilter === 'all' && (
                                    <Link href="/complaints/submit">
                                        <Button>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Submit Your First Complaint
                                        </Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
