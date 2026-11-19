import mongoose from 'mongoose';
import { PRIORITIES, STATUSES } from '../constants/index.js';

const duplicateGroupSchema = new mongoose.Schema(
  {
    mainReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
    },
    reports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
      },
    ],
    category: {
      type: String,
      required: true,
      index: true,
    },
    centroid: {
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
    totalPhotos: {
      type: Number,
      default: 0,
    },
    totalReports: {
      type: Number,
      default: 1,
    },
    priority: {
      type: String,
      enum: Object.values(PRIORITIES),
      default: PRIORITIES.LOW,
    },
    status: {
      type: String,
      enum: Object.values(STATUSES),
      default: STATUSES.REPORTED,
    },
  },
  {
    timestamps: true,
  }
);

duplicateGroupSchema.index({ centroid: '2dsphere' });

export const DuplicateGroup = mongoose.model('DuplicateGroup', duplicateGroupSchema);
