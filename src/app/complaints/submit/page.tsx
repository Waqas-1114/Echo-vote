import ComplaintSubmissionForm from '@/components/ComplaintSubmissionForm';
// No 'use client' directive needed here since this is a server component
export default function SubmitComplaint() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Submit a Complaint
                    </h1>
                    <p className="text-gray-600">
                        Report issues with government services and administrative processes.
                        Your complaint will be tracked through the administrative hierarchy.
                    </p>
                </div>

                <ComplaintSubmissionForm />
            </div>
        </div>
    );
}
