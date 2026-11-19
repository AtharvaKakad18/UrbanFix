import mongoose from 'mongoose';

const priorityRuleSchema = new mongoose.Schema(
  {
    weights: {
      safetyRisk: { type: Number, default: 25 },
      severity: { type: Number, default: 20 },
      reportCount: { type: Number, default: 15 },
      citizenConfirmations: { type: Number, default: 15 },
      ageDays: { type: Number, default: 10 },
      locationImportance: { type: Number, default: 15 },
    },
    thresholds: {
      low: { type: Number, default: 25 },
      medium: { type: Number, default: 50 },
      high: { type: Number, default: 75 },
      critical: { type: Number, default: 85 },
    },
    highImportanceLocations: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ['hospital', 'school', 'junction', 'main_road', 'other'],
          default: 'other',
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true,
        },
        radiusMeters: { type: Number, default: 250 },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PriorityRule = mongoose.model('PriorityRule', priorityRuleSchema);
