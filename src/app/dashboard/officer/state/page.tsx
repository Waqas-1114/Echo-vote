'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Officer {
    id: string;
    name: string;
    designation: string;
    employeeId: string;
    district: string;
    activeComplaints: number;
    isFree: boolean;
}

interface Complaint {
    _id: string;
    ticketNumber: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    submittedAt: string;
    daysOpen: number;
    location: {
        state: string;
        district: string;
        block: string;
    };
    assignedOfficer?: {
        name: string;
        designation: string;
        employeeId: string;
    };
    proofCount?: number;
}

interface ResolvedComplaint extends Complaint {
    proofOfWork: Array<{
        description: string;
        workDetails: string;
        photos: string[];
        submittedAt: string;
    }>;
}

interface DashboardData {
    officer?: {
        name: string;
        designation: string;
        employeeId: string;
        department: string;
    };
    freeOfficers: Officer[];
    busyOfficers: Officer[];
    unassignedComplaints: Complaint[];
    assignedComplaints: Complaint[];
    resolvedComplaints?: ResolvedComplaint[];
    closedComplaints?: Complaint[];
    statistics: {
        totalDistrictOfficers: number;
        freeOfficers: number;
        unassignedComplaints: number;
        assignedComplaints: number;
        resolvedComplaints?: number;
        closedComplaints?: number;
    };
}

export default function StateOfficerDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
    const [assignmentInstructions, setAssignmentInstructions] = useState('');
    const [deadline, setDeadline] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [verifyingComplaint, setVerifyingComplaint] = useState<ResolvedComplaint | null>(null);
    const [verificationComments, setVerificationComments] = useState('');
    const [notifyCitizen, setNotifyCitizen] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [notifyingComplaint, setNotifyingComplaint] = useState<Complaint | null>(null);
    const [closedNotificationMessage, setClosedNotificationMessage] = useState('');
    const [sendingNotification, setSendingNotification] = useState(false);

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

            const response = await fetch('/api/officer/state-dashboard', {
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

    const handleAssignComplaint = async () => {
        if (!selectedComplaint || !selectedOfficer) {
            alert('Please select both a complaint and an officer');
            return;
        }

        console.log('Selected Complaint:', selectedComplaint);
        console.log('Selected Officer:', selectedOfficer);
        console.log('Complaint ID:', selectedComplaint._id);
        console.log('Officer ID:', selectedOfficer.id);

        try {
            setAssigning(true);
            const token = localStorage.getItem('token');

            const payload = {
                complaintId: selectedComplaint._id,
                officerId: selectedOfficer.id,
                deadline: deadline || undefined,
                instructions: assignmentInstructions || undefined
            };

            console.log('Sending payload:', payload);

            const response = await fetch('/api/officer/assign-complaint', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Assignment error:', errorData);
                throw new Error(errorData.error || 'Failed to assign complaint');
            }

            alert('Complaint assigned successfully!');
            setSelectedComplaint(null);
            setSelectedOfficer(null);
            setAssignmentInstructions('');
            setDeadline('');
            fetchDashboardData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to assign complaint');
        } finally {
            setAssigning(false);
        }
    };

    const handleVerifyResolution = async (approved: boolean) => {
        if (!verifyingComplaint) return;

        try {
            setVerifying(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`/api/officer/complaints/${verifyingComplaint._id}/verify-and-close`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    verificationNotes: verificationComments || undefined,
                    approved,
                    notifyCitizen,
                    notificationMessage: notifyCitizen ? notificationMessage : undefined
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to verify resolution');
            }

            alert(approved ? 'Complaint closed successfully!' : 'Resolution rejected - sent back to officer');
            setVerifyingComplaint(null);
            setVerificationComments('');
            setNotifyCitizen(false);
            setNotificationMessage('');
            fetchDashboardData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to verify resolution');
        } finally {
            setVerifying(false);
        }
    };

    const handleNotifyClosedComplaint = async () => {
        if (!notifyingComplaint || !closedNotificationMessage.trim()) {
            alert('Please enter a notification message');
            return;
        }

        try {
            setSendingNotification(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`/api/officer/complaints/${notifyingComplaint._id}/notify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: closedNotificationMessage
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to send notification');
            }

            alert('Notification sent successfully!');
            setNotifyingComplaint(null);
            setClosedNotificationMessage('');
            fetchDashboardData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to send notification');
        } finally {
            setSendingNotification(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
            case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        window.location.href = '/auth/login';
    };

    if (!data) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">State Officer Dashboard</h1>
                        <p className="text-gray-600 mt-2">Manage district officers and assign complaints</p>
                        {data.officer && (
                            <div className="mt-3 space-y-1">
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">{data.officer.name}</span> - {data.officer.designation}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {data.officer.employeeId} | {data.officer.department}
                                </p>
                            </div>
                        )}
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
                    <Card className="p-6 bg-white">
                        <p className="text-sm text-gray-600">Total District Officers</p>
                        <p className="text-3xl font-bold text-blue-600 mt-2">{data.statistics.totalDistrictOfficers}</p>
                    </Card>
                    <Card className="p-6 bg-white">
                        <p className="text-sm text-gray-600">Free Officers</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">{data.statistics.freeOfficers}</p>
                    </Card>
                    <Card className="p-6 bg-white">
                        <p className="text-sm text-gray-600">Unassigned Complaints</p>
                        <p className="text-3xl font-bold text-orange-600 mt-2">{data.statistics.unassignedComplaints}</p>
                    </Card>
                    <Card className="p-6 bg-white">
                        <p className="text-sm text-gray-600">Assigned Complaints</p>
                        <p className="text-3xl font-bold text-purple-600 mt-2">{data.statistics.assignedComplaints}</p>
                    </Card>
                    <Card className="p-6 bg-white">
                        <p className="text-sm text-gray-600">Awaiting Verification</p>
                        <p className="text-3xl font-bold text-pink-600 mt-2">{data.statistics.resolvedComplaints || 0}</p>
                    </Card>
                    <Card className="p-6 bg-white">
                        <p className="text-sm text-gray-600">Recently Closed</p>
                        <p className="text-3xl font-bold text-teal-600 mt-2">{data.statistics.closedComplaints || 0}</p>
                    </Card>
                </div>

                {/* Assignment Panel */}
                {(selectedComplaint || selectedOfficer) && (
                    <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-blue-900">📋 Assignment Panel</h2>
                            <Button
                                onClick={() => {
                                    setSelectedComplaint(null);
                                    setSelectedOfficer(null);
                                    setAssignmentInstructions('');
                                    setDeadline('');
                                }}
                                variant="outline"
                                className="bg-white hover:bg-gray-50"
                            >
                                Clear All
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="bg-white p-5 rounded-xl shadow-md border-2 border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-bold text-gray-700 flex items-center">
                                        <span className="text-xl mr-2">🎫</span> Selected Complaint
                                    </p>
                                    {selectedComplaint && (
                                        <Button
                                            onClick={() => setSelectedComplaint(null)}
                                            size="sm"
                                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                {selectedComplaint ? (
                                    <div className="space-y-2">
                                        <p className="font-bold text-blue-700 text-lg">{selectedComplaint.ticketNumber}</p>
                                        <p className="text-sm font-semibold text-gray-900">{selectedComplaint.title}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`text-xs px-3 py-1 rounded-full font-semibold border-2 ${getPriorityColor(selectedComplaint.priority)}`}>
                                                {selectedComplaint.priority} PRIORITY
                                            </span>
                                            <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
                                                {selectedComplaint.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-2">
                                            📍 {selectedComplaint.location.district}, {selectedComplaint.location.block}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            ⏱️ Open for {selectedComplaint.daysOpen} days
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-gray-400 italic">Click on a complaint to select</p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-md border-2 border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-bold text-gray-700 flex items-center">
                                        <span className="text-xl mr-2">👮</span> Selected Officer
                                    </p>
                                    {selectedOfficer && (
                                        <Button
                                            onClick={() => setSelectedOfficer(null)}
                                            size="sm"
                                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                {selectedOfficer ? (
                                    <div className="space-y-2">
                                        <p className="font-bold text-green-700 text-lg">{selectedOfficer.name}</p>
                                        <p className="text-sm font-semibold text-gray-700">{selectedOfficer.designation}</p>
                                        <p className="text-xs text-gray-600">{selectedOfficer.employeeId}</p>
                                        <p className="text-xs text-gray-600">📍 {selectedOfficer.district}</p>
                                        <div className="mt-3 flex items-center">
                                            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${selectedOfficer.isFree ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                                            <span className="text-xs font-semibold text-gray-700">
                                                {selectedOfficer.activeComplaints} active complaints
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-gray-400 italic">Click on an officer to select</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-md border-2 border-gray-200 space-y-4">
                            <h3 className="font-bold text-gray-800 text-lg mb-4">Assignment Details</h3>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    📅 Deadline (Optional)
                                </label>
                                <Input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="border-2 border-gray-300 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    📝 Instructions (Optional)
                                </label>
                                <Textarea
                                    value={assignmentInstructions}
                                    onChange={(e) => setAssignmentInstructions(e.target.value)}
                                    placeholder="Add any specific instructions for the district officer..."
                                    rows={4}
                                    className="border-2 border-gray-300 focus:border-blue-500"
                                />
                            </div>
                            <Button
                                onClick={handleAssignComplaint}
                                disabled={!selectedComplaint || !selectedOfficer || assigning}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {assigning ? '⏳ Assigning...' : '✓ Assign Complaint to Officer'}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Verification Panel */}
                {verifyingComplaint && (
                    <Card className="p-6 mb-8 bg-pink-50 border-pink-300">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">Verify Resolution</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {verifyingComplaint.ticketNumber} - {verifyingComplaint.title}
                                </p>
                            </div>
                            <Button
                                onClick={() => {
                                    setVerifyingComplaint(null);
                                    setVerificationComments('');
                                }}
                                variant="outline"
                                size="sm"
                            >
                                Cancel
                            </Button>
                        </div>

                        <div className="mb-4">
                            <p className="font-semibold mb-2">Assigned Officer:</p>
                            <div className="bg-white p-3 rounded-lg">
                                <p className="font-bold text-purple-600">{verifyingComplaint.assignedOfficer?.name}</p>
                                <p className="text-sm text-gray-600">{verifyingComplaint.assignedOfficer?.designation}</p>
                                <p className="text-xs text-gray-500">{verifyingComplaint.assignedOfficer?.employeeId}</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="font-semibold mb-2">Proof of Work Submitted:</p>
                            <div className="space-y-3">
                                {verifyingComplaint.proofOfWork.map((proof, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-lg border-2 border-gray-200">
                                        <p className="font-semibold text-gray-900 mb-2">Proof #{idx + 1}</p>
                                        <p className="text-sm mb-2"><strong>Description:</strong> {proof.description}</p>
                                        <p className="text-sm mb-2"><strong>Work Details:</strong> {proof.workDetails}</p>
                                        {proof.photos && proof.photos.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs font-semibold mb-1">Photos:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {proof.photos.map((url, pIdx) => (
                                                        <a
                                                            key={pIdx}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:underline"
                                                        >
                                                            Photo {pIdx + 1}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                            Submitted: {new Date(proof.submittedAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Verification Comments (Optional)</label>
                                <Textarea
                                    value={verificationComments}
                                    onChange={(e) => setVerificationComments(e.target.value)}
                                    placeholder="Add any comments about the resolution..."
                                    rows={3}
                                />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                                <div className="flex items-center mb-3">
                                    <input
                                        type="checkbox"
                                        id="notifyCitizen"
                                        checked={notifyCitizen}
                                        onChange={(e) => setNotifyCitizen(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <label htmlFor="notifyCitizen" className="ml-2 text-sm font-medium text-gray-700">
                                        📢 Notify citizen upon closure
                                    </label>
                                </div>

                                {notifyCitizen && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">
                                            Notification Message
                                        </label>
                                        <Textarea
                                            value={notificationMessage}
                                            onChange={(e) => setNotificationMessage(e.target.value)}
                                            placeholder="Your complaint has been successfully verified and closed. Thank you for your patience..."
                                            rows={3}
                                            className="border-2 border-blue-300"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    onClick={() => handleVerifyResolution(true)}
                                    disabled={verifying || (notifyCitizen && !notificationMessage.trim())}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {verifying ? 'Closing...' : '✓ Approve and Close Complaint'}
                                </Button>
                                <Button
                                    onClick={() => handleVerifyResolution(false)}
                                    disabled={verifying}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {verifying ? 'Rejecting...' : '✗ Reject Resolution'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Notification Panel for Closed Complaints */}
                {notifyingComplaint && (
                    <Card className="p-6 mb-8 bg-teal-50 border-teal-300">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-teal-900">Send Notification to Citizen</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {notifyingComplaint.ticketNumber} - {notifyingComplaint.title}
                                </p>
                            </div>
                            <Button
                                onClick={() => {
                                    setNotifyingComplaint(null);
                                    setClosedNotificationMessage('');
                                }}
                                variant="outline"
                                size="sm"
                            >
                                Cancel
                            </Button>
                        </div>

                        <div className="mb-4">
                            <div className="bg-white p-4 rounded-lg border-2 border-teal-200">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Complaint Category</p>
                                        <p className="font-semibold text-gray-900">{notifyingComplaint.category}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Priority</p>
                                        <span className={`text-xs px-2 py-1 rounded-full font-semibold border-2 ${getPriorityColor(notifyingComplaint.priority)}`}>
                                            {notifyingComplaint.priority}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Location</p>
                                        <p className="text-sm text-gray-900">📍 {notifyingComplaint.location.district}, {notifyingComplaint.location.block}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Status</p>
                                        <span className="text-sm text-green-600 font-semibold">✓ CLOSED</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {notifyingComplaint.assignedOfficer && (
                            <div className="mb-4">
                                <p className="font-semibold mb-2">Assigned Officer:</p>
                                <div className="bg-white p-3 rounded-lg border-2 border-teal-200">
                                    <p className="font-bold text-teal-600">{notifyingComplaint.assignedOfficer.name}</p>
                                    <p className="text-sm text-gray-600">{notifyingComplaint.assignedOfficer.designation}</p>
                                    <p className="text-xs text-gray-500">{notifyingComplaint.assignedOfficer.employeeId}</p>
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-gray-800">Notification Message *</label>
                            <Textarea
                                value={closedNotificationMessage}
                                onChange={(e) => setClosedNotificationMessage(e.target.value)}
                                placeholder="Dear citizen, your complaint has been successfully resolved and closed. We appreciate your patience. If you need any further assistance, please feel free to reach out."
                                rows={4}
                                className="border-2 border-teal-300 focus:border-teal-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">This message will be sent to the citizen who filed the complaint</p>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={handleNotifyClosedComplaint}
                                disabled={sendingNotification || !closedNotificationMessage.trim()}
                                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                            >
                                {sendingNotification ? '📤 Sending...' : '📢 Send Notification'}
                            </Button>
                        </div>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Free Officers */}
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4 text-green-700">
                            Free Officers ({data.freeOfficers.length})
                        </h2>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {data.freeOfficers.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">No free officers available</p>
                            ) : (
                                data.freeOfficers.map((officer) => {
                                    const isSelected = selectedOfficer?.id === officer.id;
                                    return (
                                        <div
                                            key={officer.id}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition ${isSelected
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-200 bg-white hover:border-green-300'
                                                }`}
                                            onClick={() => setSelectedOfficer(officer)}
                                        >
                                            <p className="font-semibold text-gray-900">{officer.name}</p>
                                            <p className="text-sm text-gray-600">{officer.designation}</p>
                                            <p className="text-xs text-gray-500 mt-1">{officer.employeeId}</p>
                                            <p className="text-xs text-gray-500">{officer.district}</p>
                                            <div className="mt-2 flex items-center text-xs">
                                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                                <span className="text-green-700">Active: {officer.activeComplaints}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {data.busyOfficers.length > 0 && (
                            <>
                                <h3 className="text-lg font-semibold mt-6 mb-3 text-orange-700">
                                    Busy Officers ({data.busyOfficers.length})
                                </h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {data.busyOfficers.map((officer) => (
                                        <div
                                            key={officer.id}
                                            className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-75"
                                        >
                                            <p className="font-semibold text-gray-900">{officer.name}</p>
                                            <p className="text-sm text-gray-600">{officer.designation}</p>
                                            <p className="text-xs text-gray-500 mt-1">{officer.employeeId}</p>
                                            <p className="text-xs text-gray-500">{officer.district}</p>
                                            <div className="mt-2 flex items-center text-xs">
                                                <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                                                <span className="text-orange-700">Active: {officer.activeComplaints}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </Card>

                    {/* Unassigned Complaints */}
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4 text-orange-700">
                            Unassigned Complaints ({data.unassignedComplaints.length})
                        </h2>
                        <div className="space-y-3 max-h-[800px] overflow-y-auto">
                            {data.unassignedComplaints.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">No unassigned complaints</p>
                            ) : (
                                data.unassignedComplaints.map((complaint) => (
                                    <div
                                        key={complaint._id}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition ${selectedComplaint?._id === complaint._id
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 bg-white hover:border-orange-300'
                                            }`}
                                        onClick={() => setSelectedComplaint(complaint)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-bold text-blue-600 text-sm">{complaint.ticketNumber}</p>
                                            <span className={`text-xs px-2 py-1 rounded-full font-semibold border-2 ${getPriorityColor(complaint.priority)}`}>
                                                {complaint.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">{complaint.title}</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {complaint.category}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            📍 {complaint.location.district}, {complaint.location.block}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            ⏱️ {complaint.daysOpen} days open
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Assigned Complaints */}
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4 text-purple-700">
                            Assigned Complaints ({data.assignedComplaints.length})
                        </h2>
                        <div className="space-y-3 max-h-[800px] overflow-y-auto">
                            {data.assignedComplaints.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">No assigned complaints</p>
                            ) : (
                                data.assignedComplaints.map((complaint) => (
                                    <div
                                        key={complaint._id}
                                        className="p-4 rounded-lg border-2 border-gray-200 bg-white"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-bold text-blue-600 text-sm">{complaint.ticketNumber}</p>
                                            <span className={`text-xs px-2 py-1 rounded-full font-semibold border-2 ${getPriorityColor(complaint.priority)}`}>
                                                {complaint.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">{complaint.title}</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {complaint.category}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            📍 {complaint.location.district}, {complaint.location.block}
                                        </p>
                                        {complaint.assignedOfficer && (
                                            <div className="mt-2 p-2 bg-purple-50 rounded">
                                                <p className="text-xs font-semibold text-purple-900">
                                                    👤 {complaint.assignedOfficer.name}
                                                </p>
                                                <p className="text-xs text-purple-700">
                                                    {complaint.assignedOfficer.designation}
                                                </p>
                                                <p className="text-xs text-purple-600">
                                                    {complaint.assignedOfficer.employeeId}
                                                </p>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            ⏱️ {complaint.daysOpen} days open
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Resolved Complaints Awaiting Verification */}
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4 text-pink-700">
                            Awaiting Verification ({data.resolvedComplaints?.length || 0})
                        </h2>
                        <div className="space-y-3 max-h-[800px] overflow-y-auto">
                            {(!data.resolvedComplaints || data.resolvedComplaints.length === 0) ? (
                                <p className="text-gray-500 italic text-sm">No resolved complaints to verify</p>
                            ) : (
                                data.resolvedComplaints.map((complaint) => (
                                    <div
                                        key={complaint._id}
                                        className="p-4 rounded-lg border-2 border-gray-200 bg-white hover:border-pink-300 transition cursor-pointer"
                                        onClick={() => setVerifyingComplaint(complaint)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-bold text-blue-600 text-sm">{complaint.ticketNumber}</p>
                                            <span className={`text-xs px-2 py-1 rounded-full font-semibold border-2 ${getPriorityColor(complaint.priority)}`}>
                                                {complaint.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">{complaint.title}</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {complaint.category}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            📍 {complaint.location.district}, {complaint.location.block}
                                        </p>
                                        {complaint.assignedOfficer && (
                                            <div className="mt-2 p-2 bg-pink-50 rounded">
                                                <p className="text-xs font-semibold text-pink-900">
                                                    👤 {complaint.assignedOfficer.name}
                                                </p>
                                                <p className="text-xs text-pink-700">
                                                    {complaint.assignedOfficer.designation}
                                                </p>
                                            </div>
                                        )}
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-xs text-green-600 font-semibold">
                                                ✓ {complaint.proofOfWork.length} proof(s) submitted
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {complaint.daysOpen} days open
                                            </span>
                                        </div>
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setVerifyingComplaint(complaint);
                                            }}
                                            className="w-full mt-2 bg-pink-600 hover:bg-pink-700 text-white text-xs"
                                            size="sm"
                                        >
                                            Review & Verify
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Recently Closed Complaints */}
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4 text-teal-700">
                            Recently Closed ({data.closedComplaints?.length || 0})
                        </h2>
                        <div className="space-y-3 max-h-[800px] overflow-y-auto">
                            {(!data.closedComplaints || data.closedComplaints.length === 0) ? (
                                <p className="text-gray-500 italic text-sm">No recently closed complaints</p>
                            ) : (
                                data.closedComplaints.map((complaint) => (
                                    <div
                                        key={complaint._id}
                                        className="p-4 rounded-lg border-2 border-gray-200 bg-white hover:border-teal-300 transition"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-bold text-blue-600 text-sm">{complaint.ticketNumber}</p>
                                            <span className={`text-xs px-2 py-1 rounded-full font-semibold border-2 ${getPriorityColor(complaint.priority)}`}>
                                                {complaint.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">{complaint.title}</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {complaint.category}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            📍 {complaint.location.district}, {complaint.location.block}
                                        </p>
                                        {complaint.assignedOfficer && (
                                            <div className="mt-2 p-2 bg-teal-50 rounded">
                                                <p className="text-xs font-semibold text-teal-900">
                                                    👤 {complaint.assignedOfficer.name}
                                                </p>
                                                <p className="text-xs text-teal-700">
                                                    {complaint.assignedOfficer.designation}
                                                </p>
                                            </div>
                                        )}
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-xs text-green-600 font-semibold">
                                                ✓ Closed
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {complaint.daysOpen} days total
                                            </span>
                                        </div>
                                        <Button
                                            onClick={() => setNotifyingComplaint(complaint)}
                                            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white text-xs"
                                            size="sm"
                                        >
                                            📢 Send Notification
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
