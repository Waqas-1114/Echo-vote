'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Complaint {
    _id: string;
    ticketNumber: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    location: {
        state: string;
        district: string;
        block?: string;
        address?: string;
    };
    daysOpen: number;
    dueDate?: string;
    deadlineStatus: string;
    daysRemaining: number | null;
    hasAcknowledged: boolean;
    hasProof: boolean;
    proofCount: number;
    submittedAt: string;
    lastUpdate: string;
    escalationInfo?: any;
}

interface DashboardData {
    officer: {
        name: string;
        designation: string;
        employeeId: string;
        department: string;
        district: string;
    };
    complaints: {
        pending: Complaint[];
        acknowledged: Complaint[];
        inProgress: Complaint[];
        resolved: Complaint[];
    };
    statistics: {
        total: number;
        pendingAcknowledgment: number;
        acknowledged: number;
        inProgress: number;
        resolved: number;
        overdue: number;
        urgent: number;
        withProof: number;
    };
    analytics: {
        categoryBreakdown: {
            [category: string]: {
                total: number;
                pending: number;
                inProgress: number;
                resolved: number;
            };
        };
        priorityBreakdown: {
            CRITICAL: number;
            HIGH: number;
            MEDIUM: number;
            LOW: number;
        };
        performance: {
            completionRate: number;
            onTimeRate: number;
            avgResolutionTime: number;
            oldestComplaint: number;
            totalResolved: number;
            onTimeResolutions: number;
        };
        recentActivity: {
            newComplaintsLast7Days: number;
            resolvedLast7Days: number;
            dailyAverage: string;
        };
        workloadByLocation: {
            [location: string]: {
                total: number;
                pending: number;
                resolved: number;
            };
        };
    };
}

export default function DistrictOfficerDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'acknowledged' | 'inProgress' | 'resolved'>('pending');
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [actionType, setActionType] = useState<'acknowledge' | 'proof' | 'resolve' | 'notify' | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Form states
    const [acknowledgmentMessage, setAcknowledgmentMessage] = useState('');
    const [proofDescription, setProofDescription] = useState('');
    const [workDetails, setWorkDetails] = useState('');
    const [photoUrls, setPhotoUrls] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [notificationMessage, setNotificationMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Not authenticated');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/officer/district-dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }

            const result = await response.json();
            setData(result);
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard');
            setLoading(false);
        }
    };

    const handleAcknowledge = async () => {
        if (!selectedComplaint) return;

        try {
            setSubmitting(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`/api/officer/complaints/${selectedComplaint._id}/acknowledge`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: acknowledgmentMessage || undefined
                })
            });

            if (!response.ok) {
                throw new Error('Failed to acknowledge complaint');
            }

            alert('Complaint acknowledged successfully!');
            setSelectedComplaint(null);
            setActionType(null);
            setAcknowledgmentMessage('');
            fetchDashboardData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to acknowledge complaint');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitProof = async () => {
        if (!selectedComplaint || !proofDescription || !workDetails) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('token');

            const photosArray = photoUrls.split(',').map(url => url.trim()).filter(url => url);

            const response = await fetch(`/api/officer/complaints/${selectedComplaint._id}/submit-proof`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: proofDescription,
                    workDetails: workDetails,
                    photosUrls: photosArray
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit proof of work');
            }

            alert('Proof of work submitted successfully!');
            setSelectedComplaint(null);
            setActionType(null);
            setProofDescription('');
            setWorkDetails('');
            setPhotoUrls('');
            fetchDashboardData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to submit proof');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolveComplaint = async () => {
        if (!selectedComplaint || !resolutionNotes) {
            alert('Please provide resolution notes');
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`/api/officer/complaints/${selectedComplaint._id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'resolved',
                    comments: resolutionNotes
                })
            });

            if (!response.ok) {
                throw new Error('Failed to resolve complaint');
            }

            alert('Complaint marked as resolved! Awaiting state officer verification.');
            setSelectedComplaint(null);
            setActionType(null);
            setResolutionNotes('');
            fetchDashboardData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to resolve complaint');
        } finally {
            setSubmitting(false);
        }
    };

    const handleNotifyUser = async () => {
        if (!selectedComplaint || !notificationMessage) {
            alert('Please provide a notification message');
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`/api/officer/complaints/${selectedComplaint._id}/notify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: notificationMessage
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send notification');
            }

            alert('Notification sent to citizen successfully!');
            setSelectedComplaint(null);
            setActionType(null);
            setNotificationMessage('');
            fetchDashboardData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to send notification');
        } finally {
            setSubmitting(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'CRITICAL': return 'text-red-600 bg-red-50';
            case 'HIGH': return 'text-orange-600 bg-orange-50';
            case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
            case 'LOW': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getDeadlineColor = (deadlineStatus: string) => {
        switch (deadlineStatus) {
            case 'OVERDUE': return 'bg-red-100 text-red-800';
            case 'URGENT': return 'bg-orange-100 text-orange-800';
            case 'APPROACHING': return 'bg-yellow-100 text-yellow-800';
            case 'ON_TRACK': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusBadge = (complaint: Complaint) => {
        if (complaint.status === 'RESOLVED') {
            return <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">Awaiting Verification</span>;
        }
        if (complaint.hasProof) {
            return <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">Proof Submitted ({complaint.proofCount})</span>;
        }
        if (complaint.hasAcknowledged) {
            return <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Work in Progress</span>;
        }
        return <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Pending Acknowledgment</span>;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto text-center">
                    <p className="text-xl">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <Card className="p-6 bg-red-50 border-red-200">
                        <p className="text-red-800">{error}</p>
                    </Card>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        window.location.href = '/auth/login';
    };

    const currentComplaints = data.complaints[activeTab];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">District Officer Dashboard</h1>
                        <p className="text-gray-600 mt-2">
                            {data.officer.name} - {data.officer.designation}
                        </p>
                        <p className="text-sm text-gray-500">
                            {data.officer.employeeId} | {data.officer.district}
                        </p>
                    </div>
                    <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200"
                    >
                        Logout
                    </Button>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="p-4">
                        <p className="text-sm text-gray-600">Total Assigned</p>
                        <p className="text-2xl font-bold text-blue-600">{data.statistics.total}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{data.statistics.pendingAcknowledgment}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-gray-600">In Progress</p>
                        <p className="text-2xl font-bold text-orange-600">{data.statistics.inProgress}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-gray-600">Resolved</p>
                        <p className="text-2xl font-bold text-green-600">{data.statistics.resolved}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-gray-600">Overdue</p>
                        <p className="text-2xl font-bold text-red-600">{data.statistics.overdue}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-gray-600">Urgent</p>
                        <p className="text-2xl font-bold text-orange-600">{data.statistics.urgent}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-gray-600">With Proof</p>
                        <p className="text-2xl font-bold text-purple-600">{data.statistics.withProof}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-gray-600">Acknowledged</p>
                        <p className="text-2xl font-bold text-green-600">{data.statistics.acknowledged}</p>
                    </Card>
                </div>

                {/* Analytics Toggle */}
                <div className="mb-6">
                    <Button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        variant="outline"
                        className="w-full md:w-auto"
                    >
                        {showAnalytics ? '📊 Hide Analytics' : '📈 Show Detailed Analytics'}
                    </Button>
                </div>

                {/* Detailed Analytics Section */}
                {showAnalytics && (
                    <div className="mb-8 space-y-6">
                        {/* Performance Metrics */}
                        <Card className="p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-900">📊 Performance Metrics</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">Completion Rate</p>
                                    <p className="text-3xl font-bold text-blue-600">{data.analytics.performance.completionRate}%</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {data.analytics.performance.totalResolved} of {data.statistics.total} resolved
                                    </p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">On-Time Resolution</p>
                                    <p className="text-3xl font-bold text-green-600">{data.analytics.performance.onTimeRate}%</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {data.analytics.performance.onTimeResolutions} resolved on time
                                    </p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">Avg Resolution Time</p>
                                    <p className="text-3xl font-bold text-purple-600">{data.analytics.performance.avgResolutionTime}</p>
                                    <p className="text-xs text-gray-500 mt-1">days per complaint</p>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">Oldest Complaint</p>
                                    <p className="text-3xl font-bold text-orange-600">{data.analytics.performance.oldestComplaint}</p>
                                    <p className="text-xs text-gray-500 mt-1">days open</p>
                                </div>
                                <div className="bg-teal-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">New (Last 7 days)</p>
                                    <p className="text-3xl font-bold text-teal-600">{data.analytics.recentActivity.newComplaintsLast7Days}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        ~{data.analytics.recentActivity.dailyAverage} per day
                                    </p>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">Resolved (Last 7 days)</p>
                                    <p className="text-3xl font-bold text-indigo-600">{data.analytics.recentActivity.resolvedLast7Days}</p>
                                    <p className="text-xs text-gray-500 mt-1">recent resolutions</p>
                                </div>
                            </div>
                        </Card>

                        {/* Category Breakdown */}
                        <Card className="p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-900">📁 Category Breakdown</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(data.analytics.categoryBreakdown).map(([category, stats]) => (
                                    <div key={category} className="border rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-2">{category}</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Total:</span>
                                                <span className="font-medium">{stats.total}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-yellow-600">Pending:</span>
                                                <span className="font-medium">{stats.pending}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-orange-600">In Progress:</span>
                                                <span className="font-medium">{stats.inProgress}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-green-600">Resolved:</span>
                                                <span className="font-medium">{stats.resolved}</span>
                                            </div>
                                            <div className="mt-2 pt-2 border-t">
                                                <div className="text-xs text-gray-500">
                                                    Resolution Rate: {stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(0) : 0}%
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                    <div
                                                        className="bg-green-600 h-2 rounded-full"
                                                        style={{ width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Priority Breakdown */}
                        <Card className="p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-900">⚡ Priority Distribution</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <p className="text-sm text-red-600 font-medium">🔴 CRITICAL</p>
                                    <p className="text-2xl font-bold text-red-700">{data.analytics.priorityBreakdown.CRITICAL}</p>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                    <p className="text-sm text-orange-600 font-medium">🟠 HIGH</p>
                                    <p className="text-2xl font-bold text-orange-700">{data.analytics.priorityBreakdown.HIGH}</p>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-yellow-600 font-medium">🟡 MEDIUM</p>
                                    <p className="text-2xl font-bold text-yellow-700">{data.analytics.priorityBreakdown.MEDIUM}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <p className="text-sm text-green-600 font-medium">🟢 LOW</p>
                                    <p className="text-2xl font-bold text-green-700">{data.analytics.priorityBreakdown.LOW}</p>
                                </div>
                            </div>
                        </Card>

                        {/* Workload by Location */}
                        <Card className="p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-900">📍 Workload by Location</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(data.analytics.workloadByLocation).map(([location, stats]) => (
                                    <div key={location} className="border rounded-lg p-4 bg-gray-50">
                                        <h4 className="font-semibold text-gray-900 mb-3">{location}</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Total Complaints:</span>
                                                <span className="font-bold">{stats.total}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-orange-600">Pending:</span>
                                                <span className="font-bold">{stats.pending}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-green-600">Resolved:</span>
                                                <span className="font-bold">{stats.resolved}</span>
                                            </div>
                                            <div className="mt-2 pt-2 border-t">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500">Progress</span>
                                                    <span className="text-xs font-medium">
                                                        {stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(0) : 0}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                    <div
                                                        className="bg-green-600 h-2 rounded-full"
                                                        style={{ width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}

                {/* Action Modal */}
                {selectedComplaint && actionType && (
                    <Card className="p-6 mb-8 bg-blue-50 border-blue-300">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">
                                    {actionType === 'acknowledge' ? 'Acknowledge Complaint' : 'Submit Proof of Work'}
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {selectedComplaint.ticketNumber} - {selectedComplaint.title}
                                </p>
                            </div>
                            <Button
                                onClick={() => {
                                    setSelectedComplaint(null);
                                    setActionType(null);
                                    setAcknowledgmentMessage('');
                                    setProofDescription('');
                                    setWorkDetails('');
                                    setPhotoUrls('');
                                    setResolutionNotes('');
                                    setNotificationMessage('');
                                }}
                                variant="outline"
                                size="sm"
                            >
                                Cancel
                            </Button>
                        </div>

                        {actionType === 'acknowledge' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Acknowledgment Message (Optional)
                                    </label>
                                    <Textarea
                                        value={acknowledgmentMessage}
                                        onChange={(e) => setAcknowledgmentMessage(e.target.value)}
                                        placeholder="Add any message for the citizen or your superior..."
                                        rows={4}
                                    />
                                </div>
                                <Button
                                    onClick={handleAcknowledge}
                                    disabled={submitting}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {submitting ? 'Acknowledging...' : 'Acknowledge & Start Work'}
                                </Button>
                            </div>
                        ) : actionType === 'proof' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Description of Work Done <span className="text-red-600">*</span>
                                    </label>
                                    <Textarea
                                        value={proofDescription}
                                        onChange={(e) => setProofDescription(e.target.value)}
                                        placeholder="Describe what work was completed..."
                                        rows={3}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Detailed Work Report <span className="text-red-600">*</span>
                                    </label>
                                    <Textarea
                                        value={workDetails}
                                        onChange={(e) => setWorkDetails(e.target.value)}
                                        placeholder="Provide detailed information about the resolution, materials used, team involved, etc..."
                                        rows={4}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Photo URLs (Optional, comma-separated)
                                    </label>
                                    <Input
                                        value={photoUrls}
                                        onChange={(e) => setPhotoUrls(e.target.value)}
                                        placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Enter URLs of photos showing completed work, separated by commas
                                    </p>
                                </div>
                                <Button
                                    onClick={handleSubmitProof}
                                    disabled={submitting || !proofDescription || !workDetails}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Proof of Work'}
                                </Button>
                            </div>
                        ) : actionType === 'resolve' ? (
                            <div className="space-y-4">
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                                    <p className="text-sm text-yellow-800">
                                        ⚠️ <strong>Important:</strong> Once marked as resolved, this complaint will be sent to the state officer for final verification and closure.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Resolution Notes <span className="text-red-600">*</span>
                                    </label>
                                    <Textarea
                                        value={resolutionNotes}
                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                        placeholder="Provide final notes on how the complaint was resolved..."
                                        rows={4}
                                        required
                                    />
                                </div>
                                <Button
                                    onClick={handleResolveComplaint}
                                    disabled={submitting || !resolutionNotes}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {submitting ? 'Marking as Resolved...' : 'Mark as Resolved'}
                                </Button>
                            </div>
                        ) : actionType === 'notify' ? (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                                    <p className="text-sm text-blue-800">
                                        📢 Send an update notification to the citizen who filed this complaint.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Notification Message <span className="text-red-600">*</span>
                                    </label>
                                    <Textarea
                                        value={notificationMessage}
                                        onChange={(e) => setNotificationMessage(e.target.value)}
                                        placeholder="Enter message to notify the citizen about progress or updates..."
                                        rows={4}
                                        required
                                    />
                                </div>
                                <Button
                                    onClick={handleNotifyUser}
                                    disabled={submitting || !notificationMessage}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {submitting ? 'Sending...' : 'Send Notification'}
                                </Button>
                            </div>
                        ) : null}
                    </Card>
                )}

                {/* Tabs */}
                <div className="flex space-x-2 mb-6 border-b">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 font-medium ${activeTab === 'pending'
                            ? 'border-b-2 border-yellow-600 text-yellow-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Pending ({data.complaints.pending.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('acknowledged')}
                        className={`px-4 py-2 font-medium ${activeTab === 'acknowledged'
                            ? 'border-b-2 border-green-600 text-green-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Acknowledged ({data.complaints.acknowledged.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('inProgress')}
                        className={`px-4 py-2 font-medium ${activeTab === 'inProgress'
                            ? 'border-b-2 border-orange-600 text-orange-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        In Progress ({data.complaints.inProgress.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('resolved')}
                        className={`px-4 py-2 font-medium ${activeTab === 'resolved'
                            ? 'border-b-2 border-purple-600 text-purple-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Resolved ({data.complaints.resolved.length})
                    </button>
                </div>

                {/* Complaints List */}
                <div className="space-y-4">
                    {currentComplaints.length === 0 ? (
                        <Card className="p-8 text-center">
                            <p className="text-gray-500">No complaints in this category</p>
                        </Card>
                    ) : (
                        currentComplaints.map((complaint) => (
                            <Card key={complaint._id} className="p-6 hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <span className="font-bold text-blue-600">
                                                {complaint.ticketNumber}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                                                {complaint.priority}
                                            </span>
                                            {getStatusBadge(complaint)}
                                            {complaint.dueDate && (
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getDeadlineColor(complaint.deadlineStatus)}`}>
                                                    {complaint.deadlineStatus === 'OVERDUE'
                                                        ? `OVERDUE by ${Math.abs(complaint.daysRemaining || 0)} days`
                                                        : complaint.deadlineStatus === 'NO_DEADLINE'
                                                            ? 'No deadline'
                                                            : `${complaint.daysRemaining} days left`}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {complaint.title}
                                        </h3>
                                        <p className="text-gray-600 text-sm mb-3">
                                            {complaint.description.substring(0, 200)}...
                                        </p>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            <span>📁 {complaint.category}</span>
                                            <span>📍 {complaint.location.block || complaint.location.district}</span>
                                            <span>⏱️ {complaint.daysOpen} days open</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                                    {/* Show Acknowledge button only if status is SUBMITTED */}
                                    {complaint.status === 'submitted' && (
                                        <Button
                                            onClick={() => {
                                                setSelectedComplaint(complaint);
                                                setActionType('acknowledge');
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            size="sm"
                                        >
                                            ✅ Acknowledge & Start Work
                                        </Button>
                                    )}

                                    {/* Show these buttons for IN_PROGRESS complaints */}
                                    {(complaint.status === 'in_progress' || complaint.status === 'acknowledged') && (
                                        <>
                                            <Button
                                                onClick={() => {
                                                    setSelectedComplaint(complaint);
                                                    setActionType('proof');
                                                }}
                                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                                size="sm"
                                            >
                                                📸 Submit Proof of Work
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setSelectedComplaint(complaint);
                                                    setActionType('resolve');
                                                }}
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                                size="sm"
                                            >
                                                ✔️ Mark as Resolved
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setSelectedComplaint(complaint);
                                                    setActionType('notify');
                                                }}
                                                variant="outline"
                                                size="sm"
                                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                            >
                                                📢 Notify Citizen (Progress Update)
                                            </Button>
                                        </>
                                    )}

                                    {/* Show proof indicator */}
                                    {complaint.hasProof && complaint.proofCount > 0 && (
                                        <div className="flex items-center text-sm text-purple-600 font-medium bg-purple-50 px-3 py-1 rounded">
                                            ✓ {complaint.proofCount} proof document(s) submitted
                                        </div>
                                    )}

                                    {/* Show resolved status */}
                                    {complaint.status === 'resolved' && (
                                        <div className="flex items-center text-sm text-yellow-600 font-medium bg-yellow-50 px-3 py-1 rounded border border-yellow-200">
                                            ⏳ Awaiting state officer verification - Cannot notify citizen until verified
                                        </div>
                                    )}

                                    {/* Show closed status with notify button */}
                                    {complaint.status === 'closed' && (
                                        <>
                                            <div className="flex items-center text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded border border-green-200">
                                                ✓ Complaint closed by state officer
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    setSelectedComplaint(complaint);
                                                    setActionType('notify');
                                                }}
                                                variant="outline"
                                                size="sm"
                                                className="border-green-300 text-green-600 hover:bg-green-50"
                                            >
                                                📢 Send Final Notification
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
