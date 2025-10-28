import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Target, Users, Shield, Eye } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">EchoVote</span>
                        </Link>
                        <div className="flex space-x-2">
                            <Link href="/auth/login">
                                <Button variant="ghost">Login</Button>
                            </Link>
                            <Link href="/auth/register">
                                <Button>Get Started</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-12">
                {/* Hero */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">About EchoVote</h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Building transparency in Indian governance through publicly trackable feedback and complaints system.
                    </p>
                </div>

                {/* Mission */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Target className="w-6 h-6 text-blue-600" />
                            <span>Our Mission</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-700 leading-relaxed">
                            EchoVote aims to transform the way citizens interact with government services by creating
                            a transparent, trackable, and accountable complaint management system. We believe that
                            every citizen's voice deserves to be heard and every complaint deserves a transparent resolution process.
                        </p>
                    </CardContent>
                </Card>

                {/* Values */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <Card>
                        <CardHeader>
                            <Eye className="w-8 h-8 text-blue-600 mb-2" />
                            <CardTitle className="text-lg">Transparency</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">
                                Every complaint and its resolution process is publicly visible,
                                ensuring complete transparency in government response.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <Users className="w-8 h-8 text-green-600 mb-2" />
                            <CardTitle className="text-lg">Community</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">
                                Citizens can support each other's complaints, creating a community-driven
                                approach to solving public issues.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <Shield className="w-8 h-8 text-purple-600 mb-2" />
                            <CardTitle className="text-lg">Accountability</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">
                                Government departments are held accountable through public metrics
                                and transparent resolution timelines.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* How We Work */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>How We Work</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">For Citizens</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li>Submit complaints anonymously or with your identity</li>
                                    <li>Track your complaint's progress in real-time</li>
                                    <li>Support other citizens' complaints in your area</li>
                                    <li>Verify that issues are actually resolved</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">For Government Officers</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li>Receive notifications for complaints in your jurisdiction</li>
                                    <li>Update complaint status and provide resolution timelines</li>
                                    <li>Escalate issues to higher authorities when needed</li>
                                    <li>View performance metrics and citizen feedback</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Administrative Structure</h3>
                                <p className="text-gray-700">
                                    We follow India's administrative hierarchy: State → District → Sub-division →
                                    Block → Panchayat/Ward, ensuring complaints reach the right authority level
                                    and can be escalated when necessary.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Technology */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Technology & Security</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Built with Modern Tech</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li>Next.js 14+ for fast, responsive web application</li>
                                    <li>MongoDB with replica set for reliable data storage</li>
                                    <li>Docker containerization for scalable deployment</li>
                                    <li>TypeScript for type-safe development</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Security & Privacy</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li>Anonymous complaint submission options</li>
                                    <li>JWT-based secure authentication</li>
                                    <li>Role-based access control</li>
                                    <li>Data encryption and secure storage</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CTA */}
                <Card className="bg-blue-600 text-white">
                    <CardContent className="p-8 text-center">
                        <h3 className="text-2xl font-bold mb-4">Join the Movement</h3>
                        <p className="text-blue-100 mb-6">
                            Be part of building a more transparent and accountable governance system in India.
                        </p>
                        <div className="flex justify-center space-x-4">
                            <Link href="/auth/register">
                                <Button variant="secondary" size="lg">
                                    Get Started
                                </Button>
                            </Link>
                            <Link href="/complaints">
                                <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
                                    Browse Issues
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
