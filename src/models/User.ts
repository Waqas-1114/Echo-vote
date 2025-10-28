import mongoose, { Schema } from 'mongoose';
import { IUser, UserType, AdminLevel } from './interfaces';

const userSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    userType: {
        type: String,
        enum: Object.values(UserType),
        required: true,
        default: UserType.CITIZEN,
    },
    profile: {
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        address: {
            state: { type: String, required: true },
            district: { type: String, required: true },
            subDivision: String,
            block: String,
            panchayat: String,
            ward: String,
            pincode: String,
        },
    },
    governmentDetails: {
        employeeId: { type: String, trim: true },
        department: String,
        designation: String,
        adminLevel: {
            type: String,
            enum: Object.values(AdminLevel),
        },
        jurisdiction: {
            type: Schema.Types.ObjectId,
            ref: 'AdministrativeDivision',
        },
        isVerified: { type: Boolean, default: false },
        verificationDocuments: [String],
    },
    isActive: { type: Boolean, default: true },
    isAnonymous: { type: Boolean, default: false },
    anonymousId: { type: String },
}, {
    timestamps: true,
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ userType: 1 });
userSchema.index({ 'governmentDetails.employeeId': 1 });
userSchema.index({ anonymousId: 1 }, { unique: true, sparse: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
