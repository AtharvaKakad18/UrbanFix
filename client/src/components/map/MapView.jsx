import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { StatusBadge } from '../badges/StatusBadge.jsx';
import { PriorityBadge } from '../badges/PriorityBadge.jsx';
import { CategoryChip } from '../badges/CategoryChip.jsx';

// Custom Pin generator with category icon color and duplicate badge
const createCustomIcon = ({ priority = 'Low', isResolved = false, duplicateCount = 1 }) => {
  const colorMap = {
    Low: '#10b981',
    Medium: '#f59e0b',
    High: '#f97316',
    Critical: '#ef4444',
  };

  const pinColor = isResolved ? '#64748b' : colorMap[priority] || '#0d9488';
  const size = duplicateCount > 1 ? 40 : 32;

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${pinColor};
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size > 32 ? '13px' : '11px'};
      ">
        ${
          duplicateCount > 1
            ? duplicateCount
            : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
        }
      </div>
      ${
        duplicateCount > 1
          ? `<span style="
              position: absolute;
              top: -5px;
              right: -5px;
              background: #0f172a;
              color: #f8fafc;
              border: 1.5px solid white;
              border-radius: 9999px;
              padding: 0px 4px;
              font-size: 9px;
              font-weight: 800;
            ">GRP</span>`
          : ''
      }
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Component to dynamically adjust map view bounds
const MapBoundsWatcher = ({ reports, center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (reports && reports.length > 0) {
      const bounds = L.latLngBounds(
        reports
          .filter((r) => r.location?.coordinates)
          .map((r) => [r.location.coordinates[1], r.location.coordinates[0]])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } else if (center) {
      map.setView(center, zoom || 13);
    }
  }, [reports, center, zoom, map]);

  return null;
};

export const MapView = ({
  reports = [],
  center = [18.5204, 73.8567],
  zoom = 13,
  onSelectReport = null,
  showHeatmap = false,
  className = '',
}) => {
  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-soft ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsWatcher reports={reports} center={center} zoom={zoom} />

        {reports.map((report) => {
          if (!report.location?.coordinates) return null;
          const [lng, lat] = report.location.coordinates;
          const isResolved = report.status === 'Resolved' || report.status === 'Closed';
          const dupCount = report.duplicateGroup?.totalReports || 1;

          const icon = createCustomIcon({
            priority: report.priority,
            isResolved,
            duplicateCount: dupCount,
          });

          return (
            <Marker
              key={report._id}
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectReport && onSelectReport(report),
              }}
            >
              <Popup className="urbanfix-popup">
                <div className="p-3 max-w-[260px] space-y-2">
                  {report.media?.[0]?.url && (
                    <img
                      src={report.media[0].url}
                      alt={report.category}
                      className="w-full h-28 object-cover rounded-lg mb-2"
                    />
                  )}
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {report.reportCode}
                    </span>
                    <PriorityBadge priority={report.priority} size="xs" />
                  </div>
                  <CategoryChip category={report.category} />
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>
                  <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <StatusBadge status={report.status} size="xs" />
                    {dupCount > 1 && (
                      <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                        {dupCount} reports combined
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
