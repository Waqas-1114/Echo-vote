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
            _id: string;
            profile: { name: string; phone?: string };
            governmentDetails: { designation: string; employeeId?: string; department?: string };
        }>;
        assignedAt?: string;
        deadline?: string;
    };
    statusHistory: Array<{
        status: ComplaintStatus;
        updatedBy: {
            profile?: { name: string };
            governmentDetails?: { designation: string };
        } | string;
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
    proofOfWork?: Array<{
        description: string;
        workDetails: string;
        photos: string[];
        submittedBy: {
            profile: { name: string };
            governmentDetails: { designation: string };
        };
        submittedAt: string;
    }>;
    resolution?: {
        resolvedAt?: string;
        resolvedBy?: {
            profile: { name: string };
            governmentDetails: { designation: string };
        };
        resolutionNotes?: string;
        verifiedBy?: {
            profile: { name: string };
            governmentDetails: { designation: string };
        };
        verifiedAt?: string;
        verificationNotes?: string;
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
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackRating, setFeedbackRating] = useState(5);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);

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

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackText.trim()) return;

        setIsSubmittingFeedback(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/complaints/${complaintId}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rating: feedbackRating,
                    comments: feedbackText.trim()
                })
            });

            if (response.ok) {
                setFeedbackText('');
                setFeedbackRating(5);
                setShowFeedbackForm(false);
                alert('Thank you for your feedback!');
            } else {
                alert('Failed to submit feedback. Please try again.');
            }
        } catch (err) {
            console.error('Failed to submit feedback:', err);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmittingFeedback(false);
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
                                            <div>
                                                <span className="font-medium">
                                                    {history.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                                </span>
                                                {typeof history.updatedBy !== 'string' && history.updatedBy.profile && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        By: {history.updatedBy.profile.name}
                                                        {history.updatedBy.governmentDetails && ` (${history.updatedBy.governmentDetails.designation})`}
                                                    </p>
                                                )}
                                            </div>
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

                    {/* Assigned Officers Details */}
                    {complaint.assignedTo.officers && complaint.assignedTo.officers.length > 0 && (
                        <Card className="p-6">
                            <h2 className="text-xl font-semibold mb-4">👮 Assigned Officers</h2>
                            <div className="space-y-4">
                                {complaint.assignedTo.officers.map((officer, index) => (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{officer.profile.name}</h3>
                                                <p className="text-sm text-gray-600">{officer.governmentDetails.designation}</p>
                                                {officer.governmentDetails.department && (
                                                    <p className="text-sm text-gray-600">{officer.governmentDetails.department}</p>
                                                )}
                                                {officer.governmentDetails.employeeId && (
                                                    <p className="text-xs text-gray-500 mt-1">ID: {officer.governmentDetails.employeeId}</p>
                                                )}
                                                {officer.profile.phone && (
                                                    <p className="text-sm text-blue-600 mt-1">📞 {officer.profile.phone}</p>
                                                )}
                                            </div>
                                        </div>
                                        {complaint.assignedTo.assignedAt && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                Assigned on: {new Date(complaint.assignedTo.assignedAt).toLocaleString()}
                                            </p>
                                        )}
                                        {complaint.assignedTo.deadline && (
                                            <p className="text-xs text-orange-600 mt-1">
                                                Deadline: {new Date(complaint.assignedTo.deadline).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Proof of Work */}
                    {complaint.proofOfWork && complaint.proofOfWork.length > 0 && (
                        <Card className="p-6">
                            <h2 className="text-xl font-semibold mb-4">📸 Proof of Work</h2>
                            <div className="space-y-6">
                                {complaint.proofOfWork.map((proof, index) => (
                                    <div key={index} className="border-b pb-4 last:border-b-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-900">{proof.description}</h3>
                                            <span className="text-xs text-gray-500">
                                                {new Date(proof.submittedAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">
                                            By: {proof.submittedBy.profile.name} ({proof.submittedBy.governmentDetails.designation})
                                        </p>
                                        <p className="text-gray-700 mb-3 whitespace-pre-wrap">{proof.workDetails}</p>
                                        {proof.photos && proof.photos.length > 0 && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {proof.photos.map((photo, pIdx) => (
                                                    <a
                                                        key={pIdx}
                                                        href={photo}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block"
                                                    >
                                                        <img
                                                            src={photo}
                                                            alt={`Work photo ${pIdx + 1}`}
                                                            className="w-full h-40 object-cover rounded-lg hover:opacity-90 transition"
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Resolution Details */}
                    {complaint.resolution && complaint.resolution.resolvedAt && (
                        <Card className="p-6 bg-green-50 border-green-200">
                            <h2 className="text-xl font-semibold mb-4 text-green-800">✅ Resolution Details</h2>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-600">Resolved on:</p>
                                    <p className="font-medium">{new Date(complaint.resolution.resolvedAt).toLocaleString()}</p>
                                </div>
                                {complaint.resolution.resolvedBy && (
                                    <div>
                                        <p className="text-sm text-gray-600">Resolved by:</p>
                                        <p className="font-medium">
                                            {complaint.resolution.resolvedBy.profile.name} ({complaint.resolution.resolvedBy.governmentDetails.designation})
                                        </p>
                                    </div>
                                )}
                                {complaint.resolution.resolutionNotes && (
                                    <div>
                                        <p className="text-sm text-gray-600">Resolution Notes:</p>
                                        <p className="text-gray-700 mt-1">{complaint.resolution.resolutionNotes}</p>
                                    </div>
                                )}
                                {complaint.resolution.verifiedAt && (
                                    <>
                                        <div className="border-t pt-3 mt-3">
                                            <p className="text-sm text-gray-600">Verified on:</p>
                                            <p className="font-medium">{new Date(complaint.resolution.verifiedAt).toLocaleString()}</p>
                                        </div>
                                        {complaint.resolution.verifiedBy && (
                                            <div>
                                                <p className="text-sm text-gray-600">Verified by:</p>
                                                <p className="font-medium">
                                                    {complaint.resolution.verifiedBy.profile.name} ({complaint.resolution.verifiedBy.governmentDetails.designation})
                                                </p>
                                            </div>
                                        )}
                                        {complaint.resolution.verificationNotes && (
                                            <div>
                                                <p className="text-sm text-gray-600">Verification Notes:</p>
                                                <p className="text-gray-700 mt-1">{complaint.resolution.verificationNotes}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Feedback Form */}
                    {complaint.isOwner && complaint.status === ComplaintStatus.CLOSED && (
                        <Card className="p-6 bg-blue-50 border-blue-200">
                            <h2 className="text-xl font-semibold mb-4">📝 Provide Feedback</h2>
                            {!showFeedbackForm ? (
                                <Button
                                    onClick={() => setShowFeedbackForm(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Share Your Experience
                                </Button>
                            ) : (
                                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Rate the resolution (1-5 stars)
                                        </label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setFeedbackRating(star)}
                                                    className={`text-3xl ${star <= feedbackRating ? 'text-yellow-400' : 'text-gray-300'
                                                        } hover:text-yellow-400 transition`}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Your feedback
                                        </label>
                                        <textarea
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                            placeholder="Share your experience with how this complaint was handled..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows={4}
                                            maxLength={1000}
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1">{feedbackText.length}/1000 characters</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="submit"
                                            disabled={!feedbackText.trim() || isSubmittingFeedback}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setShowFeedbackForm(false);
                                                setFeedbackText('');
                                                setFeedbackRating(5);
                                            }}
                                            variant="outline"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            )}
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
                                <p className="font-medium text-black">{complaint.category}</p>
                            </div>
                            {complaint.subcategory && (
                                <div>
                                    <span className="text-gray-500">Subcategory:</span>
                                    <p className="font-medium text-black">{complaint.subcategory}</p>
                                </div>
                            )}
                            <div>
                                <span className="text-gray-500">Department:</span>
                                <p className="font-medium text-black">{complaint.assignedTo.department}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Submitted:</span>
                                <p className="font-medium text-black">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Location */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Location</h3>
                        <div className="space-y-2 text-sm">
                            <p className="text-black"><span className="text-gray-500">State:</span> {complaint.location.state}</p>
                            <p className="text-black"><span className="text-gray-500">District:</span> {complaint.location.district}</p>
                            {complaint.location.subDivision && (
                                <p className="text-black"><span className="text-gray-500">Sub-division:</span> {complaint.location.subDivision}</p>
                            )}
                            {complaint.location.block && (
                                <p className="text-black"><span className="text-gray-500">Block:</span> {complaint.location.block}</p>
                            )}
                            {complaint.location.address && (
                                <p className="text-black"><span className="text-gray-500">Address:</span> {complaint.location.address}</p>
                            )}
                        </div>
                    </Card>

                    {/* Assigned Authority */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Assigned Authority</h3>
                        <div className="space-y-2 text-sm">
                            <p className="text-black"><span className="text-gray-500">Division:</span> {complaint.assignedTo.division.name}</p>
                            <p className="text-black"><span className="text-gray-500">Level:</span> {complaint.assignedTo.division.level.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p>

                            {complaint.assignedTo.officers && complaint.assignedTo.officers.length > 0 && (
                                <div>
                                    <span className="text-gray-500">Assigned Officers:</span>
                                    {complaint.assignedTo.officers.map((officer, index) => (
                                        <p key={index} className="font-medium text-black">
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
