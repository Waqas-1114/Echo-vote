import ComplaintDetail from '@/components/ComplaintDetail';

interface ComplaintDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ComplaintDetailPage({ params }: ComplaintDetailPageProps) {
    const { id } = await params;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <ComplaintDetail complaintId={id} />
            </div>
        </div>
    );
}
