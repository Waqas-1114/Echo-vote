'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, MapPin, Clock, TrendingUp, Filter } from 'lucide-react';

export default function ComplaintsPage() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        state: '',
        category: '',
    });

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                ...(search && { search }),
                ...(filters.status && { status: filters.status }),
                ...(filters.state && { state: filters.state }),
                ...(filters.category && { category: filters.category }),
            });

            // For now, we'll show a message about authentication
            // In a real app, this would fetch from /api/complaints
            setComplaints([]);
        } catch (error) {
            console.error('Error fetching complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, [search, filters]);

    const mockComplaints = [
        {
            id: '1',
            ticketNumber: 'EVMHPN202510280001ABC',
            title: 'Broken streetlight at MG Road',
            category: 'Public Works Department (PWD)',
            status: 'in_progress',
            location: { state: 'Maharashtra', district: 'Pune', ward: 'Ward 14' },
            createdAt: '2025-10-25T10:30:00Z',
            publicSupport: { upvotes: 15 },
        },
        {
            id: '2',
            ticketNumber: 'EVDLNDL202510270002XYZ',
            title: 'Water logging during monsoon',
            category: 'Municipal Corporation',
            status: 'submitted',
            location: { state: 'Delhi', district: 'New Delhi', ward: 'Ward 8' },
            createdAt: '2025-10-24T14:15:00Z',
            publicSupport: { upvotes: 8 },
        },
        {
            id: '3',
            ticketNumber: 'EVKABEL202510260003DEF',
            title: 'Irregular garbage collection',
            category: 'Health Department',
            status: 'resolved',
            location: { state: 'Karnataka', district: 'Bengaluru', ward: 'Ward 22' },
            createdAt: '2025-10-23T09:45:00Z',
            publicSupport: { upvotes: 23 },
        },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'bg-blue-100 text-blue-800';
            case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
            case 'in_progress': return 'bg-orange-100 text-orange-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'closed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">EchoVote</span>
                        </Link>
                        <div className="flex space-x-2">
                            <Link href="/auth/login">
                                <Button variant="ghost">Login</Button>
                            </Link>
                            <Link href="/auth/register">
                                <Button>Submit Complaint</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Public Complaints</h1>
                    <p className="text-gray-600">
                        Browse and track public issues reported by citizens across India.
                        All complaints are publicly visible for transparency and accountability.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <MessageSquare className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-2xl font-bold text-gray-900">1,247</p>
                                    <p className="text-gray-600">Total Complaints</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-2xl font-bold text-gray-900">892</p>
                                    <p className="text-gray-600">Resolved</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <Clock className="w-6 h-6 text-orange-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-2xl font-bold text-gray-900">355</p>
                                    <p className="text-gray-600">In Progress</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <MapPin className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-2xl font-bold text-gray-900">28</p>
                                    <p className="text-gray-600">States Covered</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filters */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search complaints by title, location, or ticket number..."
                                        className="pl-10"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <option value="">All Status</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                                <select
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={filters.category}
                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                >
                                    <option value="">All Categories</option>
                                    <option value="PWD">Public Works</option>
                                    <option value="Health">Health Department</option>
                                    <option value="Education">Education</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Authentication Notice */}
                <Card className="mb-6 bg-blue-50 border-blue-200">
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <MessageSquare className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-blue-900">Want to see live complaints?</p>
                                <p className="text-blue-700 text-sm">
                                    <Link href="/auth/register" className="underline font-medium">Register</Link> to view and submit real complaints,
                                    or <Link href="/auth/login" className="underline font-medium">login</Link> if you already have an account.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sample Complaints */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Sample Complaints (Demo Data)</h2>

                    {mockComplaints.map((complaint) => (
                        <Card key={complaint.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-sm font-mono text-gray-500">
                                                #{complaint.ticketNumber}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                                                {getStatusText(complaint.status)}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {complaint.title}
                                        </h3>
                                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                                            <div className="flex items-center space-x-1">
                                                <MapPin className="w-4 h-4" />
                                                <span>
                                                    {complaint.location.ward}, {complaint.location.district}, {complaint.location.state}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Clock className="w-4 h-4" />
                                                <span>
                                                    {new Date(complaint.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-600 mb-1">Community Support</div>
                                        <div className="flex items-center space-x-1">
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                            <span className="font-medium text-green-600">
                                                {complaint.publicSupport.upvotes} upvotes
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-600">
                                        Category: {complaint.category}
                                    </div>
                                    <Button variant="outline" size="sm">
                                        View Details
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Call to Action */}
                <Card className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <CardContent className="p-8 text-center">
                        <h3 className="text-xl font-bold mb-2">Have a Complaint to Report?</h3>
                        <p className="mb-4 opacity-90">
                            Join EchoVote to submit your complaint and track it transparently through the resolution process.
                        </p>
                        <div className="flex justify-center space-x-4">
                            <Link href="/auth/register">
                                <Button variant="secondary" size="lg">
                                    Register & Submit Complaint
                                </Button>
                            </Link>
                            <Link href="/auth/login">
                                <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
                                    Login
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
