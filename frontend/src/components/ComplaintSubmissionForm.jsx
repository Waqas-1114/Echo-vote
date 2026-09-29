'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { COMPLAINT_CATEGORIES, ComplaintPriority, DEPARTMENTS } from '@/lib/constants';
import { getAllStatesAndUTs } from '@/data/indian-administrative-data';

// Static list of states/UTs with their districts
const states = getAllStatesAndUTs();

export default function ComplaintSubmissionForm() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Public Services',
        priority: ComplaintPriority.MEDIUM,
        department: DEPARTMENTS[0],
        location: {
            state: '',
            district: '',
            address: '',
        },
        evidenceUrls: [''],
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [error, setError] = useState('');

    // Districts of the selected state
    const districts = states.find((st) => st.name === formData.location.state)?.districts || [];

    const handleInputChange = (field, value) => {
        if (field.startsWith('location.')) {
            const locationField = field.split('.')[1];
            setFormData((prev) => ({
                ...prev,
                // Changing the state clears the district, which belongs to the old state
                location: { ...prev.location, [locationField]: value, ...(locationField === 'state' && { district: '' }) },
            }));
        } else {
            setFormData((prev) => ({ ...prev, [field]: value }));
        }
    };

    const handleEvidenceUrlChange = (index, value) => {
        setFormData((prev) => ({
            ...prev,
            evidenceUrls: prev.evidenceUrls.map((url, i) => (i === index ? value : url)),
        }));
    };

    const addEvidenceUrl = () => {
        setFormData((prev) => ({
            ...prev,
            evidenceUrls: [...prev.evidenceUrls, ''],
        }));
    };

    const removeEvidenceUrl = (index) => {
        if (formData.evidenceUrls.length > 1) {
            setFormData((prev) => ({
                ...prev,
                evidenceUrls: prev.evidenceUrls.filter((_, i) => i !== index),
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required');
            }

            const complaintData = {
                ...formData,
                evidenceUrls: formData.evidenceUrls.filter((url) => url.trim() !== ''),
            };

            const response = await fetch('/api/complaints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(complaintData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit complaint');
            }

            setSubmitSuccess(true);
            setFormData({
                title: '',
                description: '',
                category: 'Public Services',
                priority: ComplaintPriority.MEDIUM,
                department: DEPARTMENTS[0],
                location: { state: '', district: '', address: '' },
                evidenceUrls: [''],
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitSuccess) {
        return (
            <Card className="p-8 text-center">
                <div className="text-green-600 text-6xl mb-4">✓</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Complaint Submitted Successfully!</h2>
                <p className="text-gray-600 mb-6">
                    Your complaint has been submitted and will be reviewed by the appropriate administrative authority. You can track its
                    progress in your dashboard.
                </p>
                <div className="space-x-4">
                    <Button onClick={() => setSubmitSuccess(false)} variant="outline">
                        Submit Another Complaint
                    </Button>
                    <Button onClick={() => router.push('/dashboard/citizen')}>Go to Dashboard</Button>
                </div>
            </Card>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Complaint Details</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Complaint Title *</label>
                        <Input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="Brief summary of the issue"
                            required
                            maxLength={200}
                        />

                        <p className="text-sm text-gray-500 mt-1">{formData.title.length}/200 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Provide detailed information about the issue, including when it occurred and what happened..."
                            required
                            rows={6}
                            maxLength={2000}
                        />

                        <p className="text-sm text-gray-500 mt-1">{formData.description.length}/2000 characters</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                            <select
                                value={formData.category}
                                onChange={(e) => handleInputChange('category', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                {COMPLAINT_CATEGORIES.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => handleInputChange('priority', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                {Object.values(ComplaintPriority).map((priority) => (
                                    <option key={priority} value={priority}>
                                        {priority.charAt(0) + priority.slice(1).toLowerCase()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                        <select
                            value={formData.department}
                            onChange={(e) => handleInputChange('department', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            {DEPARTMENTS.map((department) => (
                                <option key={department} value={department}>
                                    {department}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Location Details</h2>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">State/UT *</label>
                            <select
                                value={formData.location.state}
                                onChange={(e) => handleInputChange('location.state', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select State/UT</option>
                                {states.map((state) => (
                                    <option key={state.name} value={state.name}>
                                        {state.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">District *</label>
                            <select
                                value={formData.location.district}
                                onChange={(e) => handleInputChange('location.district', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={!formData.location.state}
                            >
                                <option value="">Select District</option>
                                {districts.map((district) => (
                                    <option key={district} value={district}>
                                        {district}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Specific Address/Location</label>
                        <Textarea
                            value={formData.location.address}
                            onChange={(e) => handleInputChange('location.address', e.target.value)}
                            placeholder="Provide specific address, landmark, or location details..."
                            rows={3}
                            maxLength={500}
                        />

                        <p className="text-sm text-gray-500 mt-1">{formData.location.address.length}/500 characters</p>
                    </div>
                </div>
            </Card>

            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Evidence (Optional)</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Provide URLs to documents, images, or other evidence that support your complaint.
                </p>

                <div className="space-y-3">
                    {formData.evidenceUrls.map((url, index) => (
                        <div key={index} className="flex gap-2">
                            <Input
                                type="url"
                                value={url}
                                onChange={(e) => handleEvidenceUrlChange(index, e.target.value)}
                                placeholder="https://example.com/evidence-document"
                                className="flex-1"
                            />

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => removeEvidenceUrl(index)}
                                disabled={formData.evidenceUrls.length === 1}
                                className="px-3"
                            >
                                ✕
                            </Button>
                        </div>
                    ))}

                    <Button type="button" variant="outline" onClick={addEvidenceUrl} className="w-full">
                        + Add Another Evidence URL
                    </Button>
                </div>
            </Card>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800 text-sm">{error}</p>
                </div>
            )}

            <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                </Button>
            </div>
        </form>
    );
}
