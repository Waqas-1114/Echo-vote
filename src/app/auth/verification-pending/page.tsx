import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, CheckCircle, Clock } from 'lucide-react';

export default function VerificationPendingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center space-x-2 mb-4">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">EchoVote</span>
                    </Link>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-orange-600" />
                        </div>
                        <CardTitle className="text-xl">Verification Pending</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-gray-600">
                            Thank you for registering as a government officer. Your account has been created
                            and is now pending verification by our administrators.
                        </p>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• Admin will verify your government employment credentials</li>
                                <li>• You'll receive an email notification once verified</li>
                                <li>• Verification typically takes 24-48 hours</li>
                                <li>• You'll then be able to access the officer dashboard</li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                In the meantime, you can browse public complaints as a regular visitor.
                            </p>

                            <div className="flex flex-col space-y-2">
                                <Link href="/complaints">
                                    <Button variant="outline" className="w-full">
                                        Browse Public Complaints
                                    </Button>
                                </Link>
                                <Link href="/">
                                    <Button variant="ghost" className="w-full">
                                        Return to Homepage
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <p className="text-xs text-gray-500">
                                Having issues? Contact support at support@echovote.in
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
