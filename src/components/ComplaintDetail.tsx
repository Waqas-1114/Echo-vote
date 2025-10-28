'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    ComplaintStatus,
    ComplaintPriority
} from '@/models/interfaces';

interface ComplaintDetailProps {
    complaintId: string;
}

interface Complaint {
    id: string;
    ticketNumber: string;
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    status: ComplaintStatus;
    priority: ComplaintPriority;
    location: {
        state: string;
        district: string;
        subDivision?: string;
        block?: string;
        panchayat?: string;
        ward?: string;
        address?: string;
    };
    assignedTo: {
        division: {
            name: string;
            level: string;
        };
        department: string;
        officers?: Array<{
            profile: { name: string };
            governmentDetails: { designation: string };
        }>;
    };
    statusHistory: Array<{
        status: ComplaintStatus;
        updatedBy: string;
        comments?: string;
        updatedAt: string;
    }>;
    publicSupport: {
        upvotes: number;
        comments: Array<{
            comment: string;
            submittedBy: string;
            submittedAt: string;
        }>;
    };
    tags: string[];
    createdAt: string;
    updatedAt: string;
    isOwner: boolean;
}

export default function ComplaintDetail({ complaintId }: ComplaintDetailProps) {
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [supportComment, setSupportComment] = useState('');
    const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

    useEffect(() => {
        fetchComplaint();
    }, [complaintId]);

    const fetchComplaint = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`/api/complaints/${complaintId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch complaint details');
            }

            const data = await response.json();
            setComplaint(data.complaint);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleUpvote = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/complaints/${complaintId}/support`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ type: 'upvote' })
            });

            if (response.ok) {
                fetchComplaint(); // Refresh data
            }
        } catch (err) {
            console.error('Failed to upvote:', err);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supportComment.trim()) return;

        setIsSubmittingSupport(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/complaints/${complaintId}/support`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'comment',
                    comment: supportComment.trim()
                })
            });

            if (response.ok) {
                setSupportComment('');
                fetchComplaint(); // Refresh data
            }
        } catch (err) {
            console.error('Failed to add comment:', err);
        } finally {
            setIsSubmittingSupport(false);
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
            <div className="flex justify-center items-center min-h-64">
                <div className="text-lg">Loading complaint details...</div>
            </div>
        );
    }

    if (error || !complaint) {
        return (
            <Card className="p-8 text-center">
                <div className="text-red-600 text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {error || 'Complaint not found'}
                </h2>
                <Button onClick={() => window.history.back()} variant="outline">
                    Go Back
                </Button>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {complaint.title}
                    </h1>
                    <p className="text-gray-600">
                        Ticket #{complaint.ticketNumber}
                    </p>
                </div>
                <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(complaint.status)}`}>
                        {complaint.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className={`font-medium ${getPriorityColor(complaint.priority)}`}>
                        {complaint.priority.charAt(0) + complaint.priority.slice(1).toLowerCase()} Priority
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Description */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Description</h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{complaint.description}</p>
                    </Card>

                    {/* Status History */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Status History</h2>
                        <div className="space-y-4">
                            {complaint.statusHistory.map((history, index) => (
                                <div key={index} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
                                    <div className={`w-3 h-3 rounded-full mt-2 ${getStatusColor(history.status).replace('bg-', 'bg-').replace(' text-', ' ')}`}></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <span className="font-medium">
                                                {history.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {new Date(history.updatedAt).toLocaleString()}
                                            </span>
                                        </div>
                                        {history.comments && (
                                            <p className="text-gray-600 text-sm mt-1">{history.comments}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Public Support */}
                    {!complaint.isOwner && (
                        <Card className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">Public Support</h2>
                                <div className="flex items-center space-x-4">
                                    <span className="text-gray-600">{complaint.publicSupport.upvotes} upvotes</span>
                                    <Button onClick={handleUpvote} size="sm">
                                        👍 Support
                                    </Button>
                                </div>
                            </div>

                            {/* Add Comment */}
                            <form onSubmit={handleAddComment} className="mb-4">
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={supportComment}
                                        onChange={(e) => setSupportComment(e.target.value)}
                                        placeholder="Add a supportive comment..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        maxLength={500}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={!supportComment.trim() || isSubmittingSupport}
                                        size="sm"
                                    >
                                        {isSubmittingSupport ? 'Adding...' : 'Comment'}
                                    </Button>
                                </div>
                            </form>

                            {/* Comments */}
                            <div className="space-y-3">
                                {complaint.publicSupport.comments.map((comment, index) => (
                                    <div key={index} className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-gray-700">{comment.comment}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(comment.submittedAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Details */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-gray-500">Category:</span>
                                <p className="font-medium">{complaint.category}</p>
                            </div>
                            {complaint.subcategory && (
                                <div>
                                    <span className="text-gray-500">Subcategory:</span>
                                    <p className="font-medium">{complaint.subcategory}</p>
                                </div>
                            )}
                            <div>
                                <span className="text-gray-500">Department:</span>
                                <p className="font-medium">{complaint.assignedTo.department}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Submitted:</span>
                                <p className="font-medium">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Location */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Location</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">State:</span> {complaint.location.state}</p>
                            <p><span className="text-gray-500">District:</span> {complaint.location.district}</p>
                            {complaint.location.subDivision && (
                                <p><span className="text-gray-500">Sub-division:</span> {complaint.location.subDivision}</p>
                            )}
                            {complaint.location.block && (
                                <p><span className="text-gray-500">Block:</span> {complaint.location.block}</p>
                            )}
                            {complaint.location.address && (
                                <p><span className="text-gray-500">Address:</span> {complaint.location.address}</p>
                            )}
                        </div>
                    </Card>

                    {/* Assigned Authority */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Assigned Authority</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Division:</span> {complaint.assignedTo.division.name}</p>
                            <p><span className="text-gray-500">Level:</span> {complaint.assignedTo.division.level.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p>

                            {complaint.assignedTo.officers && complaint.assignedTo.officers.length > 0 && (
                                <div>
                                    <span className="text-gray-500">Assigned Officers:</span>
                                    {complaint.assignedTo.officers.map((officer, index) => (
                                        <p key={index} className="font-medium">
                                            {officer.profile.name} - {officer.governmentDetails.designation}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Tags */}
                    {complaint.tags.length > 0 && (
                        <Card className="p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {complaint.tags.map((tag, index) => (
                                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
