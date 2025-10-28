import ComplaintDetail from '@/components/ComplaintDetail';

interface ComplaintDetailPageProps {
    params: {
        id: string;
    };
}

export default function ComplaintDetailPage({ params }: ComplaintDetailPageProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <ComplaintDetail complaintId={params.id} />
            </div>
        </div>
    );
}
