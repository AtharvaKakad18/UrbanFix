import React from 'react';
import {
  Car,
  Trees,
  Droplets,
  Construction,
  AlertOctagon,
  Footprints,
  Compass,
  TrafficCone,
} from 'lucide-react';

const CATEGORY_ICONS = {
  Pothole: TrafficCone,
  'Damaged Road': Construction,
  'Broken Footpath': Footprints,
  'Blocked Footpath': AlertOctagon,
  'Vehicle Blocking Footpath': Car,
  'No Parking': Car,
  'Footpath Encroachment': AlertOctagon,
  'Construction Obstruction': Construction,
  'Road Blockage': AlertOctagon,
  'Fallen Tree': Trees,
  'Fallen Branch': Trees,
  Waterlogging: Droplets,
  'Traffic Accident': AlertOctagon,
  'Broken Traffic Signal': AlertOctagon,
  'Other Mobility Problem': Compass,
};

export const CategoryChip = ({ category = 'Other Mobility Problem', className = '' }) => {
  const Icon = CATEGORY_ICONS[category] || Compass;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${className}`}
    >
      <Icon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
      <span>{category}</span>
    </span>
  );
};
