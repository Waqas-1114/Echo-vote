'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, MapPin, Clock, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { COMPLAINT_CATEGORIES, ComplaintStatus } from '@/lib/constants';
import { getAllStatesAndUTs } from '@/data/indian-administrative-data';

const PAGE_SIZE = 10;
const statesAndUTs = getAllStatesAndUTs();

const getStatusColor = (status) => {
    switch (status) {
        case 'submitted':
            return 'bg-blue-100 text-blue-800';
        case 'acknowledged':
            return 'bg-yellow-100 text-yellow-800';
        case 'in_progress':
            return 'bg-orange-100 text-orange-800';
        case 'resolved':
            return 'bg-green-100 text-green-800';
        case 'closed':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const getStatusText = (status) => status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());

export default function ComplaintsPage() {
    const [complaints, setComplaints] = useState([]);
    const [stats, setStats] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        status: '',
        state: '',
        category: '',
    });

    // Search and filter changes start again from the first page
    const updateSearch = (value) => {
        setSearch(value);
        setPage(1);
    };
    const updateFilter = (key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    };

    useEffect(() => {
        const controller = new AbortController();
        // Debounce typing in the search box; filters and paging load right away
        const timer = setTimeout(
            async () => {
                setLoading(true);
                setError('');
                try {
                    const token = localStorage.getItem('token');
                    setIsLoggedIn(!!token);
                    const queryParams = new URLSearchParams({
                        page: String(page),
                        limit: String(PAGE_SIZE),
                        ...(search.trim() && { search: search.trim() }),
                        ...(filters.status && { status: filters.status }),
                        ...(filters.state && { state: filters.state }),
                        ...(filters.category && { category: filters.category }),
                    });

                    // The token is optional: guests see public complaints, officers also see private ones
                    const response = await fetch(`/api/complaints?${queryParams}`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                        signal: controller.signal,
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to load complaints');

                    setComplaints(data.complaints);
                    setStats(data.stats);
                    setPagination(data.pagination);
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error('Error fetching complaints:', err);
                        setError('Could not load complaints. Please try again.');
                    }
                } finally {
                    if (!controller.signal.aborted) setLoading(false);
                }
            },
            search ? 300 : 0
        );

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [search, filters, page]);

    const statCards = [
        { label: 'Total Complaints', value: stats?.total, icon: MessageSquare, color: 'blue' },
        { label: 'Resolved', value: stats?.resolved, icon: TrendingUp, color: 'green' },
        { label: 'In Progress', value: stats?.inProgress, icon: Clock, color: 'orange' },
        { label: 'States Covered', value: stats?.states, icon: MapPin, color: 'purple' },
    ];
    const statColors = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
        purple: 'bg-purple-100 text-purple-600',
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
                            {!isLoggedIn && (
                                <Link href="/auth/login">
                                    <Button variant="ghost">Login</Button>
                                </Link>
                            )}
                            <Link href={isLoggedIn ? '/complaints/submit' : '/auth/register'}>
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
                        Browse and track public issues reported by citizens across India. All complaints are publicly visible for
                        transparency and accountability.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {statCards.map(({ label, value, icon: Icon, color }) => (
                        <Card key={label}>
                            <CardContent className="p-6">
                                <div className="flex items-center">
                                    <div className={`p-2 rounded-lg ${statColors[color]}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-2xl font-bold text-gray-900">{value ?? '–'}</p>
                                        <p className="text-gray-600">{label}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
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
                                        onChange={(e) => updateSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={filters.status}
                                    onChange={(e) => updateFilter('status', e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    {Object.values(ComplaintStatus).map((status) => (
                                        <option key={status} value={status}>
                                            {getStatusText(status)}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={filters.category}
                                    onChange={(e) => updateFilter('category', e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    {COMPLAINT_CATEGORIES.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={filters.state}
                                    onChange={(e) => updateFilter('state', e.target.value)}
                                >
                                    <option value="">All States</option>
                                    {statesAndUTs.map((state) => (
                                        <option key={state.code} value={state.name}>
                                            {state.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {loading ? 'Loading complaints…' : `${pagination.totalCount} complaint${pagination.totalCount === 1 ? '' : 's'}`}
                        </h2>
                    </div>

                    {error && (
                        <Card className="bg-red-50 border-red-200">
                            <CardContent className="p-6 text-red-700">{error}</CardContent>
                        </Card>
                    )}

                    {!loading && !error && complaints.length === 0 && (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-600">No complaints match your search.</CardContent>
                        </Card>
                    )}

                    {complaints.map((complaint) => (
                        <Card key={complaint.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-sm font-mono text-gray-500">#{complaint.ticketNumber}</span>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}
                                            >
                                                {getStatusText(complaint.status)}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{complaint.title}</h3>
                                        <p className="text-sm text-gray-600 mb-2">{complaint.description}</p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                                            <div className="flex items-center space-x-1">
                                                <MapPin className="w-4 h-4" />
                                                <span>
                                                    {[complaint.location.address, complaint.location.district, complaint.location.state]
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Clock className="w-4 h-4" />
                                                <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-600 mb-1">Community Support</div>
                                        <div className="flex items-center justify-end space-x-1">
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                            <span className="font-medium text-green-600">{complaint.publicSupport?.upvotes ?? 0} upvotes</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-600">
                                        Category: {complaint.category} · {complaint.assignedTo?.department}
                                    </div>
                                    <Link href={`/complaints/${complaint.id}`}>
                                        <Button variant="outline" size="sm">
                                            View Details
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 pt-2">
                            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
                                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                            </Button>
                            <span className="text-sm text-gray-600">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.totalPages || loading}
                                onClick={() => setPage(page + 1)}
                            >
                                Next <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Call to Action */}
                {!isLoggedIn && (
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
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600"
                                    >
                                        Login
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
