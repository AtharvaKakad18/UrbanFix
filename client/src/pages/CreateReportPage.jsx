import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Camera,
  MapPin,
  FileText,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  Check,
  Building,
  Copy,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api.js';
import { ProgressStepper } from '../components/stepper/ProgressStepper.jsx';
import { ImageUploader } from '../components/media/ImageUploader.jsx';
import { LocationPicker } from '../components/map/LocationPicker.jsx';
import { ConfidenceMeter } from '../components/badges/ConfidenceMeter.jsx';
import { StatusBadge } from '../components/badges/StatusBadge.jsx';
import { CategoryChip } from '../components/badges/CategoryChip.jsx';
import { CATEGORIES } from '../utils/constants.js';

export const CreateReportPage = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState({
    lat: 18.5204,
    lng: 73.8567,
    address: 'Central Ward, Pune Metro',
  });
  const [category, setCategory] = useState('Pothole');
  const [description, setDescription] = useState('');
  const [landmark, setLandmark] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [aiResultCard, setAiResultCard] = useState(null);
  const [createdReport, setCreatedReport] = useState(null);

  const steps = [
    { label: 'Photos', icon: Camera },
    { label: 'Location', icon: MapPin },
    { label: 'Details', icon: FileText },
    { label: 'Review', icon: CheckCircle },
  ];

  const handleNext = () => {
    setSubmitError(null);
    if (currentStep === 0 && photos.length === 0) {
      setSubmitError('Please upload at least 1 photo of the problem.');
      return;
    }
    if (currentStep === 2 && description.trim().length < 5) {
      setSubmitError('Please write a brief description of at least 5 characters.');
      return;
    }
    setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const handleBack = () => {
    setSubmitError(null);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });
      formData.append('lat', location.lat);
      formData.append('lng', location.lng);
      formData.append('address', location.address || '');
      formData.append('landmark', landmark || '');
      formData.append('declaredCategory', category);
      formData.append('description', description.trim());

      const res = await api.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { report, aiAnalysisCard } = res.data?.data || {};
      setCreatedReport(report);
      setAiResultCard(aiAnalysisCard);
      toast.success('Report submitted and routed successfully!');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to submit report. Please check your data and retry.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If report submitted, render the AI Result Card!
  if (aiResultCard && createdReport) {
    const isMatch = aiResultCard.isMatch;
    const status = aiResultCard.status;

    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center ring-8 ring-teal-50/50 dark:ring-teal-950/20 shadow-glow">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              AI Analysis & Cross-Validation Complete
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Report <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{createdReport.reportCode}</span> has been processed through the xAI vision & text pipeline.
            </p>
          </div>

          {/* Classification & Confidence Box */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                  Detected Category
                </span>
                <CategoryChip category={aiResultCard.detectedCategory} />
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                  Pipeline Status
                </span>
                <StatusBadge status={status} size="sm" />
              </div>
            </div>

            <ConfidenceMeter confidence={aiResultCard.confidence} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Vision Analysis:
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  {aiResultCard.mediaSummary || 'Problem features detected in imagery.'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Text Cross-Validation:
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  {isMatch ? '✅ Image matches citizen description.' : '⚠️ Discrepancy noted; flagged for verification.'}
                </p>
              </div>
            </div>

            {aiResultCard.isDuplicate && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Copy className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Duplicate Cluster Match:</strong> This problem was automatically grouped with existing nearby reports to boost priority!
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-2 text-slate-500">
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-brand-600" />
                <span>Routed to: <strong>{aiResultCard.recommendedDepartment}</strong></span>
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Priority: {createdReport.priority} ({createdReport.priorityScore} pts)
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              to={`/reports/${createdReport._id}`}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm text-center shadow-soft flex items-center justify-center gap-2 transition-colors"
            >
              <span>View Full Report Details</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm text-center transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Report an Urban Mobility Problem
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Upload photo evidence, confirm the GPS location, and let AI assist municipal routing.
        </p>
      </div>

      {/* Stepper Header */}
      <ProgressStepper steps={steps} currentStep={currentStep} />

      {submitError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Step Container Card */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-6">
        {/* Step 0: Photos */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Step 1: Upload Photo Evidence
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Take or upload 1 to 3 clear photos. EXIF data is stripped server-side for your privacy.
              </p>
            </div>
            <ImageUploader files={photos} onChange={setPhotos} maxFiles={3} />
          </div>
        )}

        {/* Step 1: Location */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Step 2: Confirm Defect Location
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                We automatically detected your coordinates. Drag the pin or use the search bar to refine.
              </p>
            </div>
            <LocationPicker
              lat={location.lat}
              lng={location.lng}
              address={location.address}
              onChange={(newLoc) => setLocation(newLoc)}
            />
          </div>
        )}

        {/* Step 2: Description & Category */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Step 3: Problem Description
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tell us what you observed. Our AI will cross-reference this with your photo.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Category Observation
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the defect, hazards to pedestrians or two-wheelers, or approximate size..."
                  className="w-full p-3 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Landmark / Landmark Note (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Opposite City Hospital Gate 3, near Pillar 44"
                  className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Step 4: Review Report Summary
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verify your details before submitting for automated multi-modal AI classification.
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
              <div className="pb-3">
                <span className="text-xs text-slate-400 font-semibold block mb-1">Photos</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {photos.length} photo(s) selected
                </span>
              </div>

              <div className="py-3">
                <span className="text-xs text-slate-400 font-semibold block mb-1">Location</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {location.address || 'Selected Location'}
                </p>
                <span className="font-mono text-[11px] text-slate-500">
                  ({location.lat.toFixed(5)}, {location.lng.toFixed(5)})
                </span>
              </div>

              <div className="py-3">
                <span className="text-xs text-slate-400 font-semibold block mb-1">Declared Category</span>
                <CategoryChip category={category} />
              </div>

              <div className="pt-3">
                <span className="text-xs text-slate-400 font-semibold block mb-1">Citizen Description</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {description}
                </p>
                {landmark && (
                  <p className="text-xs text-slate-500 mt-1">
                    Landmark: <strong>{landmark}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-soft flex items-center gap-1.5 transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-soft hover:shadow-glow flex items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>AI Analyzing & Submitting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Submit for AI Verification</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
