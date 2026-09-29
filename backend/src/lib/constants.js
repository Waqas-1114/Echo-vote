// User Types
export const UserType = Object.freeze({
    CITIZEN: 'citizen',
    GOVERNMENT_OFFICER: 'government_officer',
    ADMIN: 'admin',
});

// Administrative Levels
export const AdminLevel = Object.freeze({
    STATE: 'state',
    DISTRICT: 'district',
    SUB_DIVISION: 'sub_division',
    BLOCK: 'block',
    PANCHAYAT: 'panchayat',
    WARD: 'ward',
});

// Complaint Status
export const ComplaintStatus = Object.freeze({
    SUBMITTED: 'submitted',
    ACKNOWLEDGED: 'acknowledged',
    IN_PROGRESS: 'in_progress',
    ESCALATED: 'escalated',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    REJECTED: 'rejected',
});

// Complaint Priority
export const ComplaintPriority = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
});

// Government departments. Officers, complaints and the forms must all use these
// exact names: complaints are routed to officers by department name.
export const DEPARTMENTS = Object.freeze([
    'Public Works Department',
    'Water Supply Department',
    'Electricity Department',
    'Health Department',
    'Waste Management Department',
    'Education Department',
    'Transport Department',
    'Revenue Department',
    'Police Department',
    'Municipal Corporation',
    'Agriculture Department',
    'Social Welfare Department',
    'Food and Supply Department',
    'General Administration',
]);

// Complaint categories offered by the submission form and the public board filter
export const COMPLAINT_CATEGORIES = Object.freeze([
    'Public Services',
    'Infrastructure',
    'Road Maintenance',
    'Traffic Management',
    'Water Supply',
    'Electricity',
    'Healthcare',
    'Sanitation',
    'Waste Management',
    'Education',
    'Public Transport',
    'Public Buildings',
    'Public Parks',
    'Environment',
    'Administration',
    'Corruption',
    'Other',
]);
