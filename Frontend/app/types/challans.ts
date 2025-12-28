/**
 * challans.ts
 * 
 * Purpose: TypeScript type definitions for the Challan Dashboard.
 * Updated: Removed payment status - only tracking verification state
 */

// KPI Card Data
export interface KPI {
  id: string;
  label: string;
  value: number;
  [key: string]: any;
}

// Challan Verification Status
export type ChallanStatus = 'PENDING' | 'VERIFIED' | 'REFUTED';

// Vehicle Information
export interface VehicleOwner {
  name: string;
  licenseNumber: string;
  contact: string;
  masked: boolean;
}

export interface Vehicle {
  vehicleNumber: string;
  vehicleType: 'CAR' | 'BIKE' | 'TRUCK' | 'AUTO' | 'BUS';
  owner: VehicleOwner;
}

// Violation Information
export interface Violation {
  type: string;
  description: string;
  ruleCode: string;
  detectedBy: 'CAMERA' | 'SPEED_CAMERA' | 'MANUAL' | 'OFFICER';
}

// Location Information
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  junctionId: string;
  junctionName: string;
  zone: string;
  coordinates: LocationCoordinates;
}

// Fine Information
export interface Fine {
  baseAmount: number;
  penalty: number;
  totalAmount: number;
  currency: string;
}

// Evidence
export interface EvidenceImage {
  url: string;
  thumbnail: string;
  capturedAt: string;
}

export interface EvidenceVideo {
  url: string;
  durationSeconds: number;
}

export interface Evidence {
  images: EvidenceImage[];
  video: EvidenceVideo | null;
}

// Audit Information
export interface IssuedBy {
  type: 'SYSTEM' | 'OFFICER';
  id: string;
}

export interface Audit {
  issuedBy: IssuedBy;
  verifiedBy: string | null;
  verifiedAt: string | null;
  lastUpdatedAt: string;
}

// Main Challan Object
export interface Challan {
  challanId: string;
  status: 'PENDING' | 'VERIFIED' | 'REFUTED' | string;
  dueDate?: string;
  issuedAt?: string;

  // Legacy / convenience fields (some components use top-level fallbacks)
  vehicleNumber?: string;
  violationType?: string;

  violation: {
    type: string;
    description?: string;
    ruleCode?: string;
    detectedBy?: string;
    [key: string]: any;
  };
  evidence: {
    images: { url: string; thumbnail: string; capturedAt: string }[];
    // allow null (some records have video: null) or undefined
    video?: { url: string; durationSeconds?: number } | null;
    [key: string]: any;
  };
  fine: {
    baseAmount: number;
    penalty: number;
    totalAmount: number;
    [key: string]: any;
  };
  vehicle: {
    vehicleNumber: string;
    vehicleType?: string;
    owner: {
      name: string;
      licenseNumber?: string;
      contact?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  location: {
    junctionName?: string;
    junctionId?: string;
    zone?: string;
    coordinates: { latitude: number; longitude: number };
    [key: string]: any;
  };
  audit: {
    issuedBy: { type: string; id: string };
    verifiedBy?: string | null;
    verifiedAt?: string | null;
    lastUpdatedAt: string;
    [key: string]: any;
  };
  notes?: string;
  [key: string]: any;
}

// Heatmap Data Point
export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity?: number;
  [key: string]: any;
}

// Pagination Metadata
export interface Pagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
}

// Filters
export interface ChallanFilters {
  violationType?: string[];
  status?: ChallanStatus[];
  startDate?: string;
  endDate?: string;
  location?: string;
}

// Download Options
export type DownloadFormat = 'csv' | 'pdf';
