import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    defaultDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    baseSeverity: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 3,
    },
    safetyRisk: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 3,
    },
    routeToPolice: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Category = mongoose.model('Category', categorySchema);
