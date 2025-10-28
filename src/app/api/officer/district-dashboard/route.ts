import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Complaint } from '@/models/Complaint';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { verifyToken } from '@/lib/auth';
import { AdminLevel, ComplaintStatus } from '@/models/interfaces';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        
        // Ensure AdministrativeDivision model is registered
        AdministrativeDivision;

        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = verifyToken(token);
        if (!user || user.userType !== 'government_officer') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get district officer
        const districtOfficer = await User.findById(user.userId);
        if (!districtOfficer || districtOfficer.governmentDetails.adminLevel !== AdminLevel.DISTRICT) {
            return NextResponse.json({ error: 'Only district officers can access this dashboard' }, { status: 403 });
        }

        // Get all complaints assigned to this district officer
        const assignedComplaints = await Complaint.find({
            'assignedTo.officers': user.userId
        })
            .populate('assignedTo.division', 'name level')
            .sort({ createdAt: -1 });

        const now = new Date();

        // Process complaints with additional info
        const processedComplaints = assignedComplaints.map(complaint => {
            const daysOpen = Math.floor((now.getTime() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            let deadlineStatus = 'NO_DEADLINE';
            let daysRemaining = null;

            if (complaint.dueDate) {
                const deadline = new Date(complaint.dueDate);
                daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                if (daysRemaining < 0) {
                    deadlineStatus = 'OVERDUE';
                } else if (daysRemaining <= 2) {
                    deadlineStatus = 'URGENT';
                } else if (daysRemaining <= 5) {
                    deadlineStatus = 'APPROACHING';
                } else {
                    deadlineStatus = 'ON_TRACK';
                }
            }

            // Check if acknowledged by district officer
            const hasAcknowledged = complaint.statusHistory.some(
                (history: any) =>
                    history.updatedBy.toString() === user.userId &&
                    history.status === ComplaintStatus.ACKNOWLEDGED
            );

            // Check if proof submitted
            const hasProof = complaint.proofOfWork && complaint.proofOfWork.length > 0;

            return {
                _id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                description: complaint.description,
                category: complaint.category,
                priority: complaint.priority,
                status: complaint.status,
                location: complaint.location,
                daysOpen,
                dueDate: complaint.dueDate,
                deadlineStatus,
                daysRemaining,
                hasAcknowledged,
                hasProof,
                proofCount: complaint.proofOfWork?.length || 0,
                submittedAt: complaint.createdAt,
                lastUpdate: complaint.statusHistory[complaint.statusHistory.length - 1]?.updatedAt || complaint.createdAt,
                escalationInfo: complaint.escalationHistory[complaint.escalationHistory.length - 1] || null
            };
        });

        // Categorize complaints
        const pending = processedComplaints.filter(c =>
            !c.hasAcknowledged &&
            (c.status === ComplaintStatus.SUBMITTED || c.status === ComplaintStatus.ACKNOWLEDGED)
        );

        const acknowledged = processedComplaints.filter(c =>
            c.hasAcknowledged &&
            c.status !== ComplaintStatus.RESOLVED &&
            c.status !== ComplaintStatus.CLOSED
        );

        const inProgress = processedComplaints.filter(c =>
            c.status === ComplaintStatus.IN_PROGRESS
        );

        const resolved = processedComplaints.filter(c =>
            c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED
        );

        const overdue = processedComplaints.filter(c => c.deadlineStatus === 'OVERDUE');
        const urgent = processedComplaints.filter(c => c.deadlineStatus === 'URGENT');

        // Calculate category breakdown
        const categoryStats = processedComplaints.reduce((acc: any, complaint) => {
            const category = complaint.category;
            if (!acc[category]) {
                acc[category] = {
                    total: 0,
                    pending: 0,
                    inProgress: 0,
                    resolved: 0
                };
            }
            acc[category].total++;
            if (complaint.status === ComplaintStatus.SUBMITTED || complaint.status === ComplaintStatus.ACKNOWLEDGED) {
                acc[category].pending++;
            } else if (complaint.status === ComplaintStatus.IN_PROGRESS) {
                acc[category].inProgress++;
            } else if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.CLOSED) {
                acc[category].resolved++;
            }
            return acc;
        }, {});

        // Priority breakdown
        const priorityStats = {
            CRITICAL: processedComplaints.filter(c => c.priority === 'CRITICAL').length,
            HIGH: processedComplaints.filter(c => c.priority === 'HIGH').length,
            MEDIUM: processedComplaints.filter(c => c.priority === 'MEDIUM').length,
            LOW: processedComplaints.filter(c => c.priority === 'LOW').length
        };

        // Time-based analytics
        const avgResolutionTime = resolved.length > 0
            ? resolved.reduce((sum, c) => sum + c.daysOpen, 0) / resolved.length
            : 0;

        const oldestComplaint = processedComplaints.length > 0
            ? Math.max(...processedComplaints.map(c => c.daysOpen))
            : 0;

        // Performance metrics
        const completionRate = processedComplaints.length > 0
            ? (resolved.length / processedComplaints.length * 100).toFixed(1)
            : '0';

        const onTimeResolutions = resolved.filter(c => {
            if (!c.dueDate) return true;
            const resolvedDate = new Date(c.lastUpdate);
            const dueDate = new Date(c.dueDate);
            return resolvedDate <= dueDate;
        }).length;

        const onTimeRate = resolved.length > 0
            ? (onTimeResolutions / resolved.length * 100).toFixed(1)
            : '0';

        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentComplaints = processedComplaints.filter(c =>
            new Date(c.submittedAt) >= sevenDaysAgo
        ).length;

        const recentResolutions = resolved.filter(c =>
            new Date(c.lastUpdate) >= sevenDaysAgo
        ).length;

        // Workload distribution
        const workloadByLocation = processedComplaints.reduce((acc: any, complaint) => {
            const location = complaint.location.block || complaint.location.district;
            if (!acc[location]) {
                acc[location] = { total: 0, pending: 0, resolved: 0 };
            }
            acc[location].total++;
            if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.CLOSED) {
                acc[location].resolved++;
            } else {
                acc[location].pending++;
            }
            return acc;
        }, {});

        return NextResponse.json({
            officer: {
                name: districtOfficer.profile.name,
                designation: districtOfficer.governmentDetails.designation,
                employeeId: districtOfficer.governmentDetails.employeeId,
                department: districtOfficer.governmentDetails.department,
                district: districtOfficer.profile.address.district
            },
            complaints: {
                pending,
                acknowledged,
                inProgress,
                resolved
            },
            statistics: {
                total: processedComplaints.length,
                pendingAcknowledgment: pending.length,
                acknowledged: acknowledged.length,
                inProgress: inProgress.length,
                resolved: resolved.length,
                overdue: overdue.length,
                urgent: urgent.length,
                withProof: processedComplaints.filter(c => c.hasProof).length
            },
            analytics: {
                categoryBreakdown: categoryStats,
                priorityBreakdown: priorityStats,
                performance: {
                    completionRate: parseFloat(completionRate),
                    onTimeRate: parseFloat(onTimeRate),
                    avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
                    oldestComplaint: oldestComplaint,
                    totalResolved: resolved.length,
                    onTimeResolutions: onTimeResolutions
                },
                recentActivity: {
                    newComplaintsLast7Days: recentComplaints,
                    resolvedLast7Days: recentResolutions,
                    dailyAverage: (recentComplaints / 7).toFixed(1)
                },
                workloadByLocation: workloadByLocation
            }
        });

    } catch (error) {
        console.error('Error fetching district dashboard:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
