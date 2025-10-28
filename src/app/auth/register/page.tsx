'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Eye, EyeOff, Mail, Lock, User, Phone, MapPin, Building, Users } from 'lucide-react';
import { UserType } from '@/models/interfaces';
import { getAllStatesAndUTs } from '@/data/indian-administrative-data';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userType = searchParams.get('type') || 'citizen';

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        userType: userType === 'officer' ? UserType.GOVERNMENT_OFFICER : UserType.CITIZEN,
        profile: {
            name: '',
            phone: '',
            isAnonymous: false,
            address: {
                state: '',
                district: '',
                subDivision: '',
                block: '',
                panchayat: '',
                ward: '',
                pincode: '',
            },
        },
        governmentDetails: {
            employeeId: '',
            department: '',
            designation: '',
            adminLevel: '',
            jurisdiction: '',
        },
    });

    // Get all states and UTs
    const statesAndUTs = getAllStatesAndUTs();

    // Get districts for selected state
    const availableDistricts = useMemo(() => {
        const selectedStateData = statesAndUTs.find(
            state => state.name === formData.profile.address.state
        );
        return selectedStateData?.districts || [];
    }, [formData.profile.address.state]);

    // Handle state change - reset district when state changes
    const handleStateChange = (stateName: string) => {
        setFormData({
            ...formData,
            profile: {
                ...formData.profile,
                address: {
                    ...formData.profile.address,
                    state: stateName,
                    district: '' // Reset district when state changes
                }
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    userType: formData.userType,
                    profile: formData.profile,
                    governmentDetails: formData.userType === UserType.GOVERNMENT_OFFICER ? formData.governmentDetails : undefined,
                }),
            });

            // Check if response is HTML (error page) instead of JSON
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                const htmlText = await response.text();
                console.error('Server returned HTML instead of JSON:', htmlText);
                throw new Error('Server error - please check the console for details');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Store token for regular users
            if (formData.userType === UserType.CITIZEN) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                router.push('/dashboard/citizen');
            } else {
                // Government officers need verification
                router.push('/auth/verification-pending');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center space-x-2 mb-4">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">EchoVote</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {formData.userType === UserType.GOVERNMENT_OFFICER ? 'Government Officer Registration' : 'Citizen Registration'}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {formData.userType === UserType.GOVERNMENT_OFFICER
                            ? 'Register as a government officer to manage citizen complaints'
                            : 'Join EchoVote to submit and track public complaints transparently'
                        }
                    </p>
                </div>

                {/* User Type Selector */}
                <div className="mb-6">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            type="button"
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${formData.userType === UserType.CITIZEN
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                            onClick={() => setFormData({ ...formData, userType: UserType.CITIZEN })}
                        >
                            <User className="inline-block w-4 h-4 mr-2" />
                            Citizen
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${formData.userType === UserType.GOVERNMENT_OFFICER
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                            onClick={() => setFormData({ ...formData, userType: UserType.GOVERNMENT_OFFICER })}
                        >
                            <Building className="inline-block w-4 h-4 mr-2" />
                            Government Officer
                        </button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Create Account</CardTitle>
                        <CardDescription>
                            {formData.userType === UserType.GOVERNMENT_OFFICER
                                ? 'Your account will need verification by administrators before activation'
                                : 'Fill in your details to get started'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                                    {error}
                                </div>
                            )}

                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900">Basic Information</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium text-gray-700">
                                            Email Address *
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="your.email@example.com"
                                                className="pl-10"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium text-gray-700">
                                            Full Name {formData.userType === UserType.GOVERNMENT_OFFICER ? '*' : '(Optional)'}
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="Enter your full name"
                                                className="pl-10"
                                                value={formData.profile.name}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    profile: { ...formData.profile, name: e.target.value }
                                                })}
                                                required={formData.userType === UserType.GOVERNMENT_OFFICER}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-sm font-medium text-gray-700">
                                            Password *
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Create a password"
                                                className="pl-10 pr-10"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                                            Confirm Password *
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                placeholder="Confirm your password"
                                                className="pl-10"
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                                        Phone Number (Optional)
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+91 9876543210"
                                            className="pl-10"
                                            value={formData.profile.phone}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                profile: { ...formData.profile, phone: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Location Information */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900">Location</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="state" className="text-sm font-medium text-gray-700">
                                            State *
                                        </label>
                                        <select
                                            id="state"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.profile.address.state}
                                            onChange={(e) => handleStateChange(e.target.value)}
                                            required
                                        >
                                            <option value="">Select State</option>
                                            {statesAndUTs.map((state) => (
                                                <option key={state.code} value={state.name}>
                                                    {state.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="district" className="text-sm font-medium text-gray-700">
                                            District *
                                        </label>
                                        <select
                                            id="district"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.profile.address.district}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                profile: {
                                                    ...formData.profile,
                                                    address: { ...formData.profile.address, district: e.target.value }
                                                }
                                            })}
                                            required
                                            disabled={!formData.profile.address.state || availableDistricts.length === 0}
                                        >
                                            <option value="">Select District</option>
                                            {availableDistricts.map((district) => (
                                                <option key={district} value={district}>
                                                    {district}
                                                </option>
                                            ))}
                                        </select>
                                        {formData.profile.address.state && availableDistricts.length === 0 && (
                                            <p className="text-sm text-gray-500">No districts available for selected state</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Government Officer Details */}
                            {formData.userType === UserType.GOVERNMENT_OFFICER && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-gray-900">Government Officer Details</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="employeeId" className="text-sm font-medium text-gray-700">
                                                Employee ID *
                                            </label>
                                            <Input
                                                id="employeeId"
                                                type="text"
                                                placeholder="Enter your employee ID"
                                                value={formData.governmentDetails.employeeId}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    governmentDetails: { ...formData.governmentDetails, employeeId: e.target.value }
                                                })}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="department" className="text-sm font-medium text-gray-700">
                                                Department *
                                            </label>
                                            <Input
                                                id="department"
                                                type="text"
                                                placeholder="e.g., Public Works Department"
                                                value={formData.governmentDetails.department}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    governmentDetails: { ...formData.governmentDetails, department: e.target.value }
                                                })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="designation" className="text-sm font-medium text-gray-700">
                                            Designation *
                                        </label>
                                        <Input
                                            id="designation"
                                            type="text"
                                            placeholder="e.g., Assistant Engineer"
                                            value={formData.governmentDetails.designation}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                governmentDetails: { ...formData.governmentDetails, designation: e.target.value }
                                            })}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Anonymity Option for Citizens */}
                            {formData.userType === UserType.CITIZEN && (
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="anonymous"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={formData.profile.isAnonymous}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            profile: { ...formData.profile, isAnonymous: e.target.checked }
                                        })}
                                    />
                                    <label htmlFor="anonymous" className="text-sm text-gray-600">
                                        I want to remain anonymous when submitting complaints (you can still track them privately)
                                    </label>
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Already have an account?{' '}
                                <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
