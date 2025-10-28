import mongoose, { Schema } from 'mongoose';
import { IAdministrativeDivision, AdminLevel } from './interfaces';

const administrativeDivisionSchema = new Schema<IAdministrativeDivision>({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    code: {
        type: String,
        required: true,
        uppercase: true,
    },
    level: {
        type: String,
        enum: Object.values(AdminLevel),
        required: true,
    },
    parentId: {
        type: Schema.Types.ObjectId,
        ref: 'AdministrativeDivision',
    },
    children: [{
        type: Schema.Types.ObjectId,
        ref: 'AdministrativeDivision',
    }],
    state: {
        type: String,
        required: true,
    },
    district: String,
    coordinates: {
        latitude: Number,
        longitude: Number,
    },
    population: Number,
    area: Number,
    contactInfo: {
        office: String,
        phone: String,
        email: String,
        website: String,
    },
    departments: [String],
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
});

// Indexes
administrativeDivisionSchema.index({ code: 1 }, { unique: true });
administrativeDivisionSchema.index({ level: 1, state: 1 });
administrativeDivisionSchema.index({ parentId: 1 });
administrativeDivisionSchema.index({ state: 1, district: 1 });

export const AdministrativeDivision = mongoose.models.AdministrativeDivision ||
    mongoose.model<IAdministrativeDivision>('AdministrativeDivision', administrativeDivisionSchema);
