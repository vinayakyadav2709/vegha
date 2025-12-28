/**
 * pdfGenerator.ts
 * 
 * Purpose: Convert HTML to PDF using html2pdf.js
 */

import type { Challan } from '@/app/types/challans';
import { generateChallanHTML, generateBulkChallanHTML } from './challanPdfTemplate';

export async function generateChallanPDF(challan: Challan): Promise<void> {
  if (typeof window === 'undefined') {
    // running on server — noop
    console.warn('generateChallanPDF called on server — skipping');
    return;
  }

  const html2pdf = (await import('html2pdf.js')).default;
  const html = generateChallanHTML(challan);
  const element = document.createElement('div');
  element.innerHTML = html;

  const options = {
    margin: 0,
    filename: `Challan_${challan.challanId}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: {
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    },
  };

  html2pdf().set(options as any).from(element).save();
}

export async function generateBulkChallanPDF(challans: Challan[]): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('generateBulkChallanPDF called on server — skipping');
    return;
  }

  if (challans.length === 0) {
    alert('No challans to download');
    return;
  }

  const html2pdf = (await import('html2pdf.js')).default;
  const html = generateBulkChallanHTML(challans);
  const element = document.createElement('div');
  element.innerHTML = html;

  const options = {
    margin: 0,
    filename: `Challans_Report_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: {
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    },
  };

  html2pdf().set(options as any).from(element).save();
}
