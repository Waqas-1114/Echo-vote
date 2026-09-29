'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, LogOut, ShieldCheck, UserX, Clock, CheckCircle } from 'lucide-react';
import { AdminLevel } from '@/lib/constants';

const TABS = [
    { key: 'pending', label: 'Pending verification' },
    { key: 'verified', label: 'Verified officers' },
    { key: 'all', label: 'All officers' },
];

const LEVELS = [AdminLevel.STATE, AdminLevel.DISTRICT, AdminLevel.BLOCK];
const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '');

export default function AdminDashboard() {
    const router = useRouter();
    const [tab, setTab] = useState('pending');
    const [officers, setOfficers] = useState([]);
    const [levels, setLevels] = useState({});
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (!token || user?.userType !== 'admin') {
                router.push('/auth/login?redirect=/dashboard/admin');
                return;
            }
            try {
                const response = await fetch(`/api/admin/officers?status=${tab}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to load officers');
                if (!cancelled) setOfficers(data.officers);
            } catch (err) {
                if (!cancelled) setMessage({ type: 'error', text: err.message });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [tab, reloadKey, router]);

    const act = async (officer, action) => {
        setBusyId(officer.id);
        setMessage(null);
        try {
            const response = await fetch(`/api/admin/officers/${officer.id}/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(action === 'verify' ? { adminLevel: levels[officer.id] || officer.adminLevel } : {}),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Action failed');
            setMessage({
                type: 'success',
                text:
                    action === 'verify'
                        ? `${officer.name} verified: ${data.officer.jurisdiction?.name} (${data.officer.adminLevel})`
                        : `${officer.name}'s registration was rejected`,
            });
            setReloadKey((key) => key + 1);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setBusyId(null);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">EchoVote Admin</span>
                    </Link>
                    <Button variant="ghost" onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Officer Verification</h1>
                <p className="text-gray-600 mb-6">
                    Officers who register themselves can only log in after you verify them. Verifying confirms their administrative
                    level and assigns the jurisdiction that matches their registered address.
                </p>

                <div className="flex gap-2 mb-6">
                    {TABS.map(({ key, label }) => (
                        <Button
                            key={key}
                            variant={tab === key ? 'default' : 'outline'}
                            onClick={() => {
                                setLoading(true);
                                setTab(key);
                            }}
                        >
                            {label}
                        </Button>
                    ))}
                </div>

                {message && (
                    <Card className={`mb-6 ${message.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <CardContent className={`p-4 ${message.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
                            {message.text}
                        </CardContent>
                    </Card>
                )}

                {loading ? (
                    <p className="text-gray-600">Loading officers…</p>
                ) : officers.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-gray-600">
                            {tab === 'pending' ? 'No officers are waiting for verification.' : 'No officers found.'}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {officers.map((officer) => (
                            <Card key={officer.id}>
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-semibold text-gray-900">{officer.name}</h3>
                                                {officer.isVerified ? (
                                                    <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Verified
                                                    </span>
                                                ) : !officer.isActive ? (
                                                    <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                                                        <UserX className="w-3 h-3 mr-1" /> Rejected
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                                                        <Clock className="w-3 h-3 mr-1" /> Pending
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {officer.designation} · {officer.department} · ID {officer.employeeId}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {officer.email}
                                                {officer.phone && ` · ${officer.phone}`}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Address:{' '}
                                                {[officer.address?.block, officer.address?.district, officer.address?.state].filter(Boolean).join(', ') ||
                                                    'Not provided'}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Jurisdiction:{' '}
                                                {officer.jurisdiction
                                                    ? `${officer.jurisdiction.name} (${capitalize(officer.jurisdiction.level)})`
                                                    : 'Not assigned yet'}
                                            </p>
                                        </div>

                                        {!officer.isVerified && officer.isActive && (
                                            <div className="flex flex-col gap-2 md:items-end">
                                                <label className="text-sm text-gray-700">
                                                    Level{' '}
                                                    <select
                                                        className="ml-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                        value={levels[officer.id] || officer.adminLevel || ''}
                                                        onChange={(e) => setLevels({ ...levels, [officer.id]: e.target.value })}
                                                    >
                                                        <option value="" disabled>
                                                            Choose level
                                                        </option>
                                                        {LEVELS.map((level) => (
                                                            <option key={level} value={level}>
                                                                {capitalize(level)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => act(officer, 'verify')}
                                                        disabled={busyId === officer.id || !(levels[officer.id] || officer.adminLevel)}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <ShieldCheck className="w-4 h-4 mr-1" /> Verify
                                                    </Button>
                                                    <Button variant="outline" onClick={() => act(officer, 'reject')} disabled={busyId === officer.id}>
                                                        <UserX className="w-4 h-4 mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
