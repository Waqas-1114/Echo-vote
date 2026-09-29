'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    MessageSquare,
    Plus,
    Search,
    User,
    LogOut,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    TrendingUp,
    FileText,
    MapPin,
    Bell,
    Megaphone,
    RefreshCw,
} from 'lucide-react';
import { ComplaintStatus, ComplaintPriority } from '@/lib/constants';

export default function CitizenDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
    });

    const [reloadKey, setReloadKey] = useState(0);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [updatesSeenAt, setUpdatesSeenAt] = useState(null);
    const refresh = () => setReloadKey((key) => key + 1);

    // Refresh when the citizen comes back to the tab, and every 30 seconds while it is open,
    // so status changes and officer notifications show up without a manual reload
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        const timer = setInterval(onVisible, 30000);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, []);

    useEffect(() => {
        const fetchComplaints = async (token, parsedUser) => {
            try {
                const response = await fetch('/api/complaints/my-complaints', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.status === 401) {
                    router.push('/auth/login');
                    return;
                }
                if (!response.ok) {
                    throw new Error('Failed to fetch complaints');
                }

                const data = await response.json();
                setComplaints(data.complaints || []);

                // Calculate stats (closed complaints were resolved and verified)
                const total = data.complaints?.length || 0;
                const pending = data.complaints?.filter((c) => c.status === ComplaintStatus.SUBMITTED).length || 0;
                const inProgress =
                    data.complaints?.filter((c) =>
                        [ComplaintStatus.ACKNOWLEDGED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.ESCALATED].includes(c.status)
                    ).length || 0;
                const resolved =
                    data.complaints?.filter((c) => [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED].includes(c.status)).length || 0;

                setStats({ total, pending, inProgress, resolved });
                setUser(parsedUser);
                setLastRefreshed(new Date());
                try {
                    setUpdatesSeenAt(localStorage.getItem(`echovote:updatesSeen:${parsedUser.id}`));
                } catch {
                    // storage unavailable: every update counts as new
                }
            } catch (error) {
                console.error('Error fetching complaints:', error);
            } finally {
                setLoading(false);
            }
        };

        // Check if user is logged in
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/auth/login');
            return;
        }

        let parsedUser;
        try {
            parsedUser = JSON.parse(userData);
        } catch (error) {
            console.error('Error parsing user data:', error);
            router.push('/auth/login');
            return;
        }

        // One login is shared by every tab: if an officer/admin signed in elsewhere,
        // this is no longer a citizen session, so go to that account's dashboard
        if (parsedUser.userType !== 'citizen') {
            router.push(parsedUser.userType === 'admin' ? '/dashboard/admin' : '/dashboard/officer');
            return;
        }

        fetchComplaints(token, parsedUser);
    }, [router, reloadKey]);

    // Everything officials posted on the citizen's complaints, newest first
    const updates = useMemo(
        () =>
            complaints
                .flatMap((complaint) =>
                    complaint.statusHistory
                        .filter((entry) => entry.updatedBy && typeof entry.updatedBy === 'object' && entry.updatedBy.governmentDetails)
                        .map((entry) => ({
                            complaintId: complaint._id,
                            title: complaint.title,
                            status: entry.status,
                            comments: entry.comments,
                            updatedAt: entry.updatedAt,
                            officer: entry.updatedBy.profile?.name,
                            designation: entry.updatedBy.governmentDetails.designation,
                            isNotification: entry.comments?.startsWith('📢'),
                        }))
                )
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        [complaints]
    );
    const isNewUpdate = (update) => !updatesSeenAt || new Date(update.updatedAt) > new Date(updatesSeenAt);
    const newUpdatesCount = updates.filter(isNewUpdate).length;

    const markUpdatesSeen = () => {
        const now = new Date().toISOString();
        setUpdatesSeenAt(now);
        try {
            localStorage.setItem(`echovote:updatesSeen:${user.id}`, now);
        } catch {
            // storage unavailable: nothing to persist
        }
    };


    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case ComplaintStatus.SUBMITTED:
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case ComplaintStatus.ACKNOWLEDGED:
            case ComplaintStatus.IN_PROGRESS:
                return <AlertCircle className="w-4 h-4 text-blue-500" />;
            case ComplaintStatus.RESOLVED:
            case ComplaintStatus.CLOSED:
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case ComplaintStatus.REJECTED:
                return <XCircle className="w-4 h-4 text-red-500" />;
            case ComplaintStatus.ESCALATED:
                return <TrendingUp className="w-4 h-4 text-orange-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case ComplaintStatus.SUBMITTED:
                return 'bg-yellow-100 text-yellow-800';
            case ComplaintStatus.ACKNOWLEDGED:
            case ComplaintStatus.IN_PROGRESS:
                return 'bg-blue-100 text-blue-800';
            case ComplaintStatus.RESOLVED:
                return 'bg-green-100 text-green-800';
            case ComplaintStatus.CLOSED:
                return 'bg-emerald-100 text-emerald-800';
            case ComplaintStatus.REJECTED:
                return 'bg-red-100 text-red-800';
            case ComplaintStatus.ESCALATED:
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority) => {
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

    const filteredComplaints = complaints.filter((complaint) => {
        const matchesSearch =
            complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                                <span className="text-sm text-gray-700">{user?.profile?.name || user?.email || 'Anonymous User'}</span>
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
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {user?.profile?.name || 'Citizen'}!</h1>
                        <p className="text-gray-600">
                            Track your complaints and submit new ones for your area: {user?.profile?.address?.district},{' '}
                            {user?.profile?.address?.state}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => router.push('/complaints/submit')} className="bg-blue-600 hover:bg-blue-700">
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
                                    <p className="text-sm font-medium text-gray-600">Resolved / Closed</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Updates from officials */}
                <Card className="mb-8">
                    <CardContent className="p-6">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-blue-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Updates from officials</h2>
                                {newUpdatesCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                        {newUpdatesCount} new
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                {lastRefreshed && <span>Updated {lastRefreshed.toLocaleTimeString()}</span>}
                                <Button variant="ghost" size="sm" onClick={refresh}>
                                    <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                                </Button>
                                {newUpdatesCount > 0 && (
                                    <Button variant="outline" size="sm" onClick={markUpdatesSeen}>
                                        Mark all read
                                    </Button>
                                )}
                            </div>
                        </div>

                        {updates.length === 0 ? (
                            <p className="text-sm text-gray-500">No updates yet. Officers&apos; actions and messages on your complaints will appear here.</p>
                        ) : (
                            <ul className="space-y-3">
                                {updates.slice(0, 8).map((update, index) => (
                                    <li
                                        key={`${update.complaintId}-${index}`}
                                        className={`p-3 rounded-lg border ${update.isNotification ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
                                    >
                                        <div className="flex justify-between gap-2 text-xs text-gray-500 mb-1">
                                            <span className="flex items-center gap-1">
                                                {update.isNotification && <Megaphone className="w-3 h-3 text-blue-600" />}
                                                <span className="font-medium text-gray-700">
                                                    {update.officer} ({update.designation})
                                                </span>
                                                {isNewUpdate(update) && <span className="text-red-600 font-semibold">• new</span>}
                                            </span>
                                            <span>{new Date(update.updatedAt).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-800">
                                            {update.isNotification ? update.comments.replace(/^📢\s*/, '') : update.comments}
                                        </p>
                                        <Link href={`/complaints/${update.complaintId}`} className="text-xs text-blue-600 hover:underline">
                                            {update.title} · {update.status.replace(/_/g, ' ')}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                    <Link href="/complaints/submit">
                        <Button className="flex items-center space-x-2 text-black">
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
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all" className="text-black">
                                All Status
                            </option>
                            <option value={ComplaintStatus.SUBMITTED} className="text-black">
                                Submitted
                            </option>
                            <option value={ComplaintStatus.ACKNOWLEDGED} className="text-black">
                                Acknowledged
                            </option>
                            <option value={ComplaintStatus.IN_PROGRESS} className="text-black">
                                In Progress
                            </option>
                            <option value={ComplaintStatus.RESOLVED} className="text-black">
                                Resolved (awaiting verification)
                            </option>
                            <option value={ComplaintStatus.CLOSED} className="text-black">
                                Closed (verified)
                            </option>
                            <option value={ComplaintStatus.REJECTED} className="text-black">
                                Rejected
                            </option>
                            <option value={ComplaintStatus.ESCALATED} className="text-black">
                                Escalated
                            </option>
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
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{complaint.title}</h3>
                                                    <p className="text-sm text-gray-600 mb-2">Ticket: {complaint.ticketNumber}</p>
                                                </div>
                                                <div className="flex items-center space-x-2">{getStatusIcon(complaint.status)}</div>
                                            </div>

                                            <p className="text-gray-700 mb-3 line-clamp-2">{complaint.description}</p>

                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}
                                                >
                                                    {complaint.status === ComplaintStatus.CLOSED ? 'closed · verified' : complaint.status.replace(/_/g, ' ')}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}
                                                >
                                                    {complaint.priority} Priority
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {complaint.category}
                                                </span>
                                            </div>

                                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                                                <div className="flex items-center space-x-1">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>
                                                        {complaint.location.district}, {complaint.location.state}
                                                    </span>
                                                </div>
                                                <span>Created: {new Date(complaint.createdAt).toLocaleDateString()}</span>
                                                <span>{complaint.publicSupport.upvotes} upvotes</span>
                                            </div>

                                            {complaint.statusHistory.length > 1 && (
                                                <p className="mt-2 text-sm text-gray-600">
                                                    <span className="font-medium">Latest update:</span>{' '}
                                                    {complaint.statusHistory.at(-1).comments?.replace(/^📢\s*/, '')}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex space-x-2">
                                            {complaint.status === ComplaintStatus.CLOSED && !complaint.feedback && (
                                                <Link href={`/complaints/${complaint._id}`}>
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                                        Rate the resolution
                                                    </Button>
                                                </Link>
                                            )}
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
                                        : "You haven't submitted any complaints yet. Start by submitting your first complaint."}
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
