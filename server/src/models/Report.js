import mongoose from 'mongoose';
import { STATUSES, PRIORITIES } from '../constants/index.js';

const mediaItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    phash: { type: String, default: '' },
    originalName: { type: String, default: '' },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

const workLogSchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    remarks: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    reportCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    media: [mediaItemSchema],
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    landmark: {
      type: String,
      trim: true,
      default: '',
    },
    aiMedia: {
      category: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      severity: { type: Number, default: 1 },
      safetyRisk: { type: Number, default: 1 },
      rawSummary: { type: String, default: '' },
      isMobilityProblem: { type: Boolean, default: true },
      imageQualityIssue: { type: String, default: '' },
    },
    aiText: {
      category: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      summary: { type: String, default: '' },
      isSpamLikely: { type: Boolean, default: false },
    },
    crossValidation: {
      match: { type: Boolean, default: false },
      finalCategory: { type: String, default: '' },
      finalConfidence: { type: Number, default: 0 },
      flag: { type: String, default: '' }, // e.g. MATCH, MISMATCH, MANUAL_FALLBACK
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(STATUSES),
      default: STATUSES.REPORTED,
      index: true,
    },
    priorityScore: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(PRIORITIES),
      default: PRIORITIES.LOW,
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    suggestedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    assignedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    assignmentSource: {
      type: String,
      default: '', // 'admin-manual', 'police-auto-route', 'reassigned'
    },
    reassignmentRequest: {
      requested: { type: Boolean, default: false },
      reason: { type: String, default: '' },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      requestedAt: { type: Date, default: null },
      status: { type: String, enum: ['pending', 'approved', 'declined', null], default: null },
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deletedReason: {
      type: String,
      default: '',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    policeAction: {
      actionType: { type: String, default: '' }, // 'vehicle_cleared', 'towed', 'challan_issued', 'signal_reported'
      remarks: { type: String, default: '' },
      officerBadge: { type: String, default: '' },
      timestamp: { type: Date, default: null },
    },
    policeNeedsVerification: {
      type: Boolean,
      default: false,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    duplicateGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DuplicateGroup',
      default: null,
      index: true,
    },
    supporters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    confirmations: {
      type: Number,
      default: 0,
    },
    stillExistsCount: {
      type: Number,
      default: 0,
    },
    resolution: {
      beforePhoto: { type: String, default: '' },
      afterPhoto: { type: String, default: '' },
      description: { type: String, default: '' },
      remarks: { type: String, default: '' },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      resolvedAt: { type: Date, default: null },
    },
    citizenVerification: {
      accepted: { type: Boolean, default: null },
      comment: { type: String, default: '' },
      at: { type: Date, default: null },
    },
    workLogs: [workLogSchema],
    spamFlags: [
      {
        reason: { type: String, required: true },
        flaggedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-hook to exclude soft-deleted reports unless explicitly queried with { isDeleted: true }
reportSchema.pre(/^find/, function () {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

reportSchema.pre('countDocuments', function () {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

// 2dsphere index for location search and proximity duplicate detection
reportSchema.index({ location: '2dsphere' });
reportSchema.index({ createdAt: -1 });

export const Report = mongoose.model('Report', reportSchema);
