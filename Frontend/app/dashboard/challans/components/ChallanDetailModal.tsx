/**
 * ChallanDetailModal.tsx
 * 
 * Updated: Fixed contrast issues and improved color scheme
 */

'use client';

import React, { useMemo } from 'react';
import { X, Download, Check, XCircle, MapPin, User, FileText, Camera, AlertTriangle, Calendar, Shield } from 'lucide-react';
import { format } from 'date-fns';
import type { Challan } from '@/app/types/challans';
import { generateChallanPDF } from '@/app/lib/pdfGenerator';

interface ChallanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  challanId: string;
  allChallans: Challan[];
  onUpdateChallan: (updatedChallan: Challan) => void;
}

export default function ChallanDetailModal({
  isOpen,
  onClose,
  challanId,
  allChallans,
  onUpdateChallan,
}: ChallanDetailModalProps) {
  const detail = useMemo(() => {
    if (!isOpen || !challanId) return null;
    return allChallans.find((c) => c.challanId === challanId) || null;
  }, [isOpen, challanId, allChallans]);

  // safe formatted due date (guard against undefined)
  const formattedDue = detail && detail.dueDate
    ? format(new Date(detail.dueDate), 'dd MMM yyyy')
    : 'N/A';

  // safe formatted issued date (guard against undefined)
  const formattedIssuedAt = detail && detail.issuedAt
    ? format(new Date(detail.issuedAt), 'dd MMM yyyy, hh:mm a')
    : 'N/A';
  
  const handleVerify = () => {
    if (!detail) return;

    const updatedChallan: Challan = {
      ...detail,
      status: 'VERIFIED',
      audit: {
        ...detail.audit,
        verifiedBy: 'Admin User',
        verifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      },
    };

    onUpdateChallan(updatedChallan);
  };

  const handleRefute = () => {
    if (!detail) return;

    const updatedChallan: Challan = {
      ...detail,
      status: 'REFUTED',
      audit: {
        ...detail.audit,
        verifiedBy: 'Admin User',
        verifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      },
    };

    onUpdateChallan(updatedChallan);
  };

  const handleDownloadPDF = () => {
    if (!detail) return;
    try {
      generateChallanPDF(detail);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('❌ Failed to generate PDF. Please try again.');
    }
  };

  if (!isOpen || !detail) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-theme-surface rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto
                      border border-[var(--color-border)]">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[var(--color-primary)]/5 to-transparent 
                        p-6 border-b-2 border-[var(--color-border)] sticky top-0 bg-theme-surface z-10 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-2xl font-bold text-theme-text">Traffic Violation Challan</h2>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border-2
                              ${
                                detail.status === 'VERIFIED'
                                  ? 'bg-green-500 text-white border-green-600'
                                  : detail.status === 'REFUTED'
                                    ? 'bg-red-500 text-white border-red-600'
                                    : 'bg-yellow-500 text-white border-yellow-600'
                              }`}
                >
                  {detail.status === 'VERIFIED' && <Check className="h-3 w-3 mr-1" />}
                  {detail.status === 'REFUTED' && <XCircle className="h-3 w-3 mr-1" />}
                  {detail.status === 'PENDING' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {detail.status}
                </span>
              </div>
              
              <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-theme-text">Challan ID:</span>
                  <code className="px-2 py-1 bg-[var(--color-primary)]/10 rounded text-[var(--color-primary)] font-mono font-bold">
                    {detail.challanId}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-theme-text">
                  <Calendar className="h-4 w-4 text-theme-muted" />
                  <span>Due: <strong className="text-red-600">{formattedDue}</strong></span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* ========== EVIDENCE SECTION (TOP PRIORITY) ========== */}
          

          {/* ========== VIOLATION & FINE SUMMARY (PROMINENT) ========== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Violation Details */}
            <div className="rounded-xl border-2 border-red-300 bg-theme-surface p-5 shadow-md">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-red-200">
                <div className="p-2 rounded-lg bg-red-600">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-theme-text">Violation Details</h3>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between items-start pb-3 border-b border-[var(--color-border)]">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">Type</dt>
                  <dd className="text-sm font-bold text-theme-text text-right">
                    {detail.violation.type.replace(/_/g, ' ')}
                  </dd>
                </div>
                <div className="pb-3 border-b border-[var(--color-border)]">
                  <dt className="text-xs font-semibold text-theme-muted uppercase mb-1">Description</dt>
                  <dd className="text-sm text-theme-text font-medium">
                    {detail.violation.description}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">Rule Code</dt>
                  <dd className="text-sm font-bold text-theme-text">{detail.violation.ruleCode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">Detected By</dt>
                  <dd className="text-sm font-bold text-theme-text">{detail.violation.detectedBy}</dd>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-[var(--color-border)]">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">Date & Time</dt>
                  <dd className="text-sm font-bold text-theme-text">
                    {formattedIssuedAt}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Fine Breakdown */}
            <div className="rounded-xl border-2 border-orange-300 bg-theme-surface p-5 shadow-md">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-orange-200">
                <div className="p-2 rounded-lg bg-orange-600">
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-theme-text">Fine Breakdown</h3>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">Base Fine</dt>
                  <dd className="text-sm font-bold text-theme-text">
                    ₹{detail.fine.baseAmount.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">Penalty / Late Fee</dt>
                  <dd className="text-sm font-bold text-theme-text">
                    ₹{detail.fine.penalty.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="flex justify-between items-center pt-3 bg-orange-600 -mx-5 -mb-5 px-5 py-4 rounded-b-xl">
                  <dt className="text-base font-bold text-white uppercase">TOTAL AMOUNT</dt>
                  <dd className="text-2xl font-black text-white">
                    ₹{detail.fine.totalAmount.toLocaleString('en-IN')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* ========== VEHICLE & OWNER INFO ========== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Vehicle Information */}
            <div className="rounded-xl border-2 border-blue-300 bg-theme-surface p-5 shadow-md">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-blue-200">
                <div className="p-2 rounded-lg bg-blue-600">
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-theme-text">Vehicle Information</h3>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">Vehicle Number</dt>
                  <dd className="text-sm font-bold text-theme-text">{detail.vehicle.vehicleNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">Vehicle Type</dt>
                  <dd className="text-sm font-bold text-theme-text">{detail.vehicle.vehicleType}</dd>
                </div>
              </dl>
            </div>

            {/* Owner Details */}
            <div className="rounded-xl border-2 border-purple-300 bg-theme-surface p-5 shadow-md">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-purple-200">
                <div className="p-2 rounded-lg bg-purple-600">
                  <User className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-theme-text">Owner Details</h3>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">Name</dt>
                  <dd className="text-sm font-bold text-theme-text">{detail.vehicle.owner.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">License Number</dt>
                  <dd className="text-sm font-bold text-theme-text">{detail.vehicle.owner.licenseNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-semibold text-theme-muted uppercase">Contact</dt>
                  <dd className="text-sm font-bold text-theme-text">{detail.vehicle.owner.contact}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* ========== LOCATION ========== */}
          <div className="rounded-xl border-2 border-green-300 bg-theme-surface p-5 shadow-md">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-green-200">
              <div className="p-2 rounded-lg bg-green-600">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-theme-text">Violation Location</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-xs font-semibold text-theme-muted uppercase mb-1">Junction</dt>
                <dd className="text-sm font-bold text-theme-text">{detail.location.junctionName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-theme-muted uppercase mb-1">Junction ID</dt>
                <dd className="text-sm font-bold text-theme-text">{detail.location.junctionId}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-theme-muted uppercase mb-1">Zone</dt>
                <dd className="text-sm font-bold text-theme-text">{detail.location.zone}</dd>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t-2 border-[var(--color-border)]">
              <dt className="text-xs font-semibold text-theme-muted uppercase mb-1">Coordinates</dt>
              <dd className="text-sm font-mono font-bold text-theme-text">
                {detail.location.coordinates.latitude.toFixed(5)}, {detail.location.coordinates.longitude.toFixed(5)}
              </dd>
            </div>
          </div>

          {/* ========== AUDIT TRAIL ========== */}
          <div className="rounded-xl border-2 border-gray-300 bg-theme-surface p-5 shadow-md">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-200">
              <div className="p-2 rounded-lg bg-gray-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-theme-text">Audit Trail</h3>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-xs font-semibold text-theme-muted uppercase mb-1">Issued By</dt>
                <dd className="text-sm font-bold text-theme-text">
                  {detail.audit.issuedBy.type} ({detail.audit.issuedBy.id})
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-theme-muted uppercase mb-1">Verified By</dt>
                <dd className="text-sm font-bold text-theme-text">
                  {detail.audit.verifiedBy || 'Pending Verification'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-theme-muted uppercase mb-1">Last Updated</dt>
                <dd className="text-sm font-bold text-theme-text">
                  {format(new Date(detail.audit.lastUpdatedAt), 'dd MMM yyyy, HH:mm')}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ========== FOOTER: ACTIONS ========== */}
        <div className="flex items-center justify-between p-6 border-t-2 border-[var(--color-border)] 
                        sticky bottom-0 bg-theme-surface backdrop-blur-sm">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-[var(--color-primary)]
                       bg-[var(--color-primary)] text-white font-semibold
                       hover:bg-[var(--color-primary)]/90 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Download className="h-5 w-5" />
            Download PDF
          </button>

          {/* Verification Actions */}
          {detail.status === 'PENDING' && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefute}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold
                           hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
              >
                <XCircle className="h-5 w-5" />
                Refute Challan
              </button>
              <button
                onClick={handleVerify}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold
                           hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
              >
                <Check className="h-5 w-5" />
                Verify Challan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
