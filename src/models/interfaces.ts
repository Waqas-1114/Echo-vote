import mongoose, { Schema, Document } from 'mongoose';

// User Types
export enum UserType {
    CITIZEN = 'citizen',
    GOVERNMENT_OFFICER = 'government_officer',
    ADMIN = 'admin'
}

// Administrative Levels
export enum AdminLevel {
    STATE = 'state',
    DISTRICT = 'district',
    SUB_DIVISION = 'sub_division',
    BLOCK = 'block',
    PANCHAYAT = 'panchayat',
    WARD = 'ward'
}

// Complaint Status
export enum ComplaintStatus {
    SUBMITTED = 'submitted',
    ACKNOWLEDGED = 'acknowledged',
    IN_PROGRESS = 'in_progress',
    ESCALATED = 'escalated',
    RESOLVED = 'resolved',
    CLOSED = 'closed',
    REJECTED = 'rejected'
}

// Complaint Priority
export enum ComplaintPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// User Interface
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    password: string;
    userType: UserType;
    profile: {
        name?: string;
        phone?: string;
        address?: {
            state: string;
            district: string;
            subDivision?: string;
            block?: string;
            panchayat?: string;
            ward?: string;
            pincode?: string;
        };
    };
    governmentDetails?: {
        employeeId: string;
        department: string;
        designation: string;
        adminLevel: AdminLevel;
        jurisdiction: mongoose.Types.ObjectId; // Reference to AdministrativeDivision
        isVerified: boolean;
        verificationDocuments?: string[];
    };
    isActive: boolean;
    isAnonymous: boolean; // For citizens who want to remain anonymous
    anonymousId?: string; // Unique anonymous identifier
    createdAt: Date;
    updatedAt: Date;
}

// Administrative Division Interface
export interface IAdministrativeDivision extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    code: string; // Official government code
    level: AdminLevel;
    parentId?: mongoose.Types.ObjectId; // Reference to parent division
    children?: mongoose.Types.ObjectId[]; // References to child divisions
    state: string;
    district?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    population?: number;
    area?: number; // in square kilometers
    contactInfo?: {
        office: string;
        phone?: string;
        email?: string;
        website?: string;
    };
    departments: string[]; // List of departments/services available
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Complaint Interface
export interface IComplaint extends Document {
    _id: mongoose.Types.ObjectId;
    ticketNumber: string; // Unique public identifier
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    priority: ComplaintPriority;
    status: ComplaintStatus;

    // Location and jurisdiction
    location: {
        state: string;
        district: string;
        subDivision?: string;
        block?: string;
        panchayat?: string;
        ward?: string;
        address?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };

    // User information (anonymous or identified)
    submittedBy: {
        userId?: mongoose.Types.ObjectId; // For registered users
        anonymousId?: string; // For anonymous users
        contactInfo?: {
            phone?: string;
            email?: string;
        };
    };

    // Assigned jurisdiction and officers
    assignedTo: {
        division: mongoose.Types.ObjectId; // Administrative division
        department: string;
        officers?: mongoose.Types.ObjectId[]; // Assigned government officers
    };

    // Escalation tracking
    escalationHistory: Array<{
        fromDivision: mongoose.Types.ObjectId;
        toDivision: mongoose.Types.ObjectId;
        reason: string;
        escalatedBy: mongoose.Types.ObjectId;
        escalatedAt: Date;
    }>;

    // Status tracking
    statusHistory: Array<{
        status: ComplaintStatus;
        updatedBy: mongoose.Types.ObjectId;
        comments?: string;
        updatedAt: Date;
    }>;

    // Attachments and evidence
    attachments: Array<{
        filename: string;
        url: string;
        type: string;
        uploadedAt: Date;
    }>;

    // Proof of work submitted by officers
    proofOfWork?: Array<{
        description: string;
        workDetails: string;
        photos?: string[];
        submittedBy: mongoose.Types.ObjectId;
        submittedAt: Date;
    }>;

    // Public engagement
    publicSupport: {
        upvotes: number;
        comments: Array<{
            comment: string;
            submittedBy: string; // Anonymous ID or user ID
            submittedAt: Date;
        }>;
    };

    // Resolution details
    resolution?: {
        description: string;
        resolvedBy: mongoose.Types.ObjectId;
        resolvedAt: Date;
        verificationRequired: boolean;
        verifiedBy?: mongoose.Types.ObjectId;
        verifiedAt?: Date;
    };

    resolvedAt?: Date;

    // Citizen feedback (for closed complaints)
    feedback?: {
        rating: number; // 1-5 stars
        comments?: string;
        categories?: string[]; // e.g., "Timely Response", "Quality Work"
        submittedAt: Date;
    };

    // Metadata
    isPublic: boolean;
    tags: string[];
    dueDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Notification Interface
export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;
    recipientId: mongoose.Types.ObjectId;
    recipientType: UserType;
    type: string; // 'complaint_assigned', 'status_update', 'escalation', etc.
    title: string;
    message: string;
    relatedComplaint?: mongoose.Types.ObjectId;
    isRead: boolean;
    createdAt: Date;
}

// Department/Service Category Interface
export interface IDepartment extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    code: string;
    description: string;
    parentDepartment?: mongoose.Types.ObjectId;
    adminLevels: AdminLevel[]; // Which administrative levels handle this department
    categories: Array<{
        name: string;
        subcategories?: string[];
    }>;
    slaHours: number; // Service Level Agreement in hours
    escalationRules: {
        autoEscalateAfterHours: number;
        escalateTo: AdminLevel;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
