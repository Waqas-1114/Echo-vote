import mongoose, { Schema } from 'mongoose';
import { IComplaint, ComplaintStatus, ComplaintPriority } from './interfaces';

const complaintSchema = new Schema<IComplaint>({
    ticketNumber: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    subcategory: String,
    priority: {
        type: String,
        enum: Object.values(ComplaintPriority),
        default: ComplaintPriority.MEDIUM,
    },
    status: {
        type: String,
        enum: Object.values(ComplaintStatus),
        default: ComplaintStatus.SUBMITTED,
    },
    location: {
        state: { type: String, required: true },
        district: { type: String, required: true },
        subDivision: String,
        block: String,
        panchayat: String,
        ward: String,
        address: String,
        coordinates: {
            latitude: Number,
            longitude: Number,
        },
    },
    submittedBy: {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        anonymousId: String,
        contactInfo: {
            phone: String,
            email: String,
        },
    },
    assignedTo: {
        division: {
            type: Schema.Types.ObjectId,
            ref: 'AdministrativeDivision',
            required: true,
        },
        department: { type: String, required: true },
        officers: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
    },
    escalationHistory: [{
        fromDivision: {
            type: Schema.Types.ObjectId,
            ref: 'AdministrativeDivision',
        },
        toDivision: {
            type: Schema.Types.ObjectId,
            ref: 'AdministrativeDivision',
        },
        reason: String,
        escalatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        escalatedAt: Date,
    }],
    statusHistory: [{
        status: {
            type: String,
            enum: Object.values(ComplaintStatus),
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        comments: String,
        updatedAt: { type: Date, default: Date.now },
    }],
    attachments: [{
        filename: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
    }],
    publicSupport: {
        upvotes: { type: Number, default: 0 },
        comments: [{
            comment: String,
            submittedBy: String,
            submittedAt: { type: Date, default: Date.now },
        }],
    },
    proofOfWork: [{
        description: String,
        workDetails: String,
        photos: [String],
        submittedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        submittedAt: { type: Date, default: Date.now },
    }],
    resolution: {
        description: String,
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        resolvedAt: Date,
        verificationRequired: { type: Boolean, default: true },
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        verifiedAt: Date,
    },
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5,
        },
        comments: String,
        submittedAt: Date,
    },
    resolvedAt: Date,
    isPublic: { type: Boolean, default: true },
    tags: [String],
    dueDate: Date,
}, {
    timestamps: true,
});

// Indexes
complaintSchema.index({ ticketNumber: 1 }, { unique: true });
complaintSchema.index({ status: 1 });
complaintSchema.index({ 'location.state': 1, 'location.district': 1 });
complaintSchema.index({ 'assignedTo.division': 1 });
complaintSchema.index({ 'submittedBy.userId': 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ createdAt: -1 });

export const Complaint = mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', complaintSchema);
