/**
 * challanPdfTemplate.ts
 * 
 * Purpose: Generate HTML template for challan reports in professional format
 * Similar to the invoice template provided
 */

import type { Challan } from '@/app/types/challans';
import { format } from 'date-fns';

export function generateChallanHTML(challan: Challan): string {
  const statusColor =
    challan.status === 'VERIFIED'
      ? '#22c55e'
      : challan.status === 'REFUTED'
        ? '#ef4444'
        : '#fb9200';

  const statusBg =
    challan.status === 'VERIFIED'
      ? '#dcfce7'
      : challan.status === 'REFUTED'
        ? '#fee2e2'
        : '#fef3c7';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Traffic Challan - ${challan.challanId}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f3f4f6;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          @page {
            size: 210mm 297mm;
            margin: 0;
          }

          .print-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 20mm;
            background-color: white;
            color: #1f2937;
            font-size: 11px;
            line-height: 1.4;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          }

          .header {
            margin-bottom: 15px;
            border-bottom: 3px solid #1f2937;
            padding-bottom: 10px;
          }

          .header h1 {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
            text-transform: uppercase;
          }

          .header-subtitle {
            text-align: center;
            font-weight: 700;
            font-size: 12px;
            margin-bottom: 15px;
            color: #374151;
          }

          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 10px;
            background-color: ${statusBg};
            color: ${statusColor};
            border: 2px solid ${statusColor};
            margin-bottom: 10px;
          }

          .row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
          }

          .col-left, .col-right {
            flex: 1;
          }

          .info-section {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            color: #1f2937;
          }

          .info-section h3 {
            font-weight: 700;
            font-size: 10px;
            border-bottom: 2px solid #1f2937;
            padding-bottom: 5px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color:#000000;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px dotted #d1d5db;
          }

          .info-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
          }

          .info-label {
            font-weight: 600;
            color: #6b7280;
            flex: 0 0 40%;
          }

          .info-value {
            font-weight: 500;
            color: #1f2937;
            text-align: right;
            flex: 1;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 10px;
          }

          table thead {
            background-color: #9b8bc2;
            color: white;
          }

          table th {
            padding: 8px;
            text-align: left;
            font-weight: 700;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          table td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
          }

          .text-right {
            text-align: right;
          }

          .fine-table tfoot td {
            background-color: #f3f4f6;
            font-weight: 700;
            border-top: 2px solid #1f2937;
          }

          .location-box {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 12px;
          }

          .location-title {
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 5px;
            font-size: 10px;
            text-transform: uppercase;
          }

          .location-content {
            color: #374151;
            line-height: 1.5;
          }

          .footer {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #1f2937;
            display: flex;
            gap: 15px;
            font-size: 9px;
          }

          .footer-left, .footer-right {
            flex: 1;
          }

          .footer-right {
            text-align: right;
          }

          .footer-section {
            margin-bottom: 8px;
          }

          .footer-section-title {
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 3px;
          }

          .footer-section-content {
            color: #6b7280;
            line-height: 1.3;
          }

          @media print {
            .print-container {
              box-shadow: none;
              padding: 10mm;
            }
          }
        </style>
    </head>
    <body>
        <div class="print-container">
          <div class="header">
            <h1>🚨 TRAFFIC CHALLAN</h1>
            <div class="header-subtitle">VIOLATION NOTICE</div>
            <div style="margin-bottom: 10px;">
              <span class="status-badge">${challan.status}</span>
            </div>
          </div>

          <div style="margin-bottom: 12px;">
            <strong>Challan ID:</strong> ${challan.challanId}
            <span style="float: right; color: #6b7280;">
              Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
            </span>
          </div>

          <div class="row">
            <div class="col-left">
              <div class="info-section">
                <h3>🚗 Vehicle Information</h3>
                <div class="info-row">
                  <span class="info-label">Vehicle Number:</span>
                  <span class="info-value">${challan.vehicle.vehicleNumber}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Vehicle Type:</span>
                  <span class="info-value">${challan.vehicle.vehicleType}</span>
                </div>
              </div>

              <div class="info-section">
                <h3>👤 Owner Details</h3>
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${challan.vehicle.owner.name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">License No:</span>
                  <span class="info-value">${challan.vehicle.owner.licenseNumber}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Contact:</span>
                  <span class="info-value">${challan.vehicle.owner.contact}</span>
                </div>
              </div>
            </div>

            <div class="col-right">
              <div class="info-section">
                <h3>⚠️ Violation Details</h3>
                <div class="info-row">
                  <span class="info-label">Violation:</span>
                  <span class="info-value">${challan.violation.type.replace(/_/g, ' ')}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Rule Code:</span>
                  <span class="info-value">${challan.violation.ruleCode}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Detected By:</span>
                  <span class="info-value">${challan.violation.detectedBy}</span>
                </div>
              </div>

              <div class="info-section">
                <h3>📅 Date & Time</h3>
                <div class="info-row">
                  <span class="info-label">Date:</span>
                  <span class="info-value">${safeFormat(challan.issuedAt, 'date')}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Time:</span>
                  <span class="info-value">${safeFormat(challan.issuedAt, 'time')}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Due Date:</span>
                  <span class="info-value" style="color: #dc2626;">${safeFormat(challan.dueDate, 'date')}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="location-box">
            <div class="location-title">📍 Violation Location</div>
            <div class="location-content">
              <strong>${challan.location.junctionName}</strong> (${challan.location.junctionId}) | Zone: ${challan.location.zone}
              <br/>
              <small>Coordinates: ${challan.location.coordinates.latitude.toFixed(5)}, ${challan.location.coordinates.longitude.toFixed(5)}</small>
            </div>
          </div>

          <div class="info-section">
            <h3>📝 Violation Description</h3>
            <div style="color: #374151; line-height: 1.5;">
              ${challan.violation.description}
            </div>
          </div>

          <div style="margin-bottom: 12px;">
            <h4 style="font-weight: 700; margin-bottom: 8px; font-size: 10px; text-transform: uppercase;">💰 Fine Breakdown</h4>
            <table class="fine-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Fine</td>
                  <td class="text-right">₹ ${challan.fine.baseAmount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td>Penalty / Late Fee</td>
                  <td class="text-right">₹ ${challan.fine.penalty.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td style="text-transform: uppercase;">TOTAL FINE</td>
                  <td class="text-right" style="font-size: 12px;">₹ ${challan.fine.totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="footer">
            <div class="footer-left">
              <div class="footer-section">
                <div class="footer-section-title">Issued By:</div>
                <div class="footer-section-content">
                  ${challan.audit.issuedBy.type} (${challan.audit.issuedBy.id})
                </div>
              </div>
              <div class="footer-section">
                <div class="footer-section-title">Verified By:</div>
                <div class="footer-section-content">
                  ${challan.audit.verifiedBy || 'Pending Verification'}
                </div>
              </div>
            </div>
            <div class="footer-right">
              <div class="footer-section">
                <div class="footer-section-title">Notice:</div>
                <div class="footer-section-content">
                  Payment must be made by the due date to avoid additional penalties.
                </div>
              </div>
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 8px; color: #6b7280;">
                  This is an electronically generated document. No signature required.
                </div>
              </div>
            </div>
          </div>

        </div>
    </body>
    </html>
  `;

  return html;
}

// safe date formatter — avoids calling new Date(undefined) which breaks TS builds
function safeFormat(iso?: string, mode: 'date' | 'time' | 'datetime' = 'date') {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    if (mode === 'date') {
      return d.toLocaleDateString('en-GB'); // yields DD/MM/YYYY-like format
    }
    if (mode === 'time') {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function generateBulkChallanHTML(challans: Challan[]): string {
  const verified = challans.filter((c) => c.status === 'VERIFIED').length;
  const pending = challans.filter((c) => c.status === 'PENDING').length;
  const refuted = challans.filter((c) => c.status === 'REFUTED').length;
  const totalFines = challans.reduce((sum, c) => sum + c.fine.totalAmount, 0);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Challan Report</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f3f4f6;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 20mm;
            background-color: white;
            color: #1f2937;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #1f2937;
            padding-bottom: 15px;
          }

          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
          }

          .header p {
            font-size: 12px;
            color: #6b7280;
          }

          .summary {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
          }

          .summary-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
          }

          .summary-card h3 {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .summary-card .value {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          table thead {
            background-color: #9b8bc2;
            color: white;
          }

          table th {
            padding: 10px;
            text-align: left;
            font-weight: 700;
            font-size: 9px;
            text-transform: uppercase;
          }

          table td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
          }

          table tbody tr:nth-child(even) {
            background-color: #f9fafb;
          }

          .status-verified {
            background-color: #dcfce7;
            color: #22c55e;
            padding: 3px 8px;
            border-radius: 3px;
            font-weight: 600;
          }

          .status-pending {
            background-color: #fef3c7;
            color: #fb9200;
            padding: 3px 8px;
            border-radius: 3px;
            font-weight: 600;
          }

          .status-refuted {
            background-color: #fee2e2;
            color: #ef4444;
            padding: 3px 8px;
            border-radius: 3px;
            font-weight: 600;
          }

          .text-right {
            text-align: right;
          }

          @media print {
            body {
              background-color: white;
            }
            .print-container {
              box-shadow: none;
            }
          }
        </style>
    </head>
    <body>
        <div class="print-container">
          <div class="header">
            <h1>TRAFFIC CHALLAN REPORT</h1>
            <p>Generated on ${format(new Date(), 'dd MMMM yyyy, HH:mm')}</p>
          </div>

          <div class="summary">
            <div class="summary-card">
              <h3>Total Challans</h3>
              <div class="value">${challans.length}</div>
            </div>
            <div class="summary-card">
              <h3>Verified</h3>
              <div class="value" style="color: #22c55e;">${verified}</div>
            </div>
            <div class="summary-card">
              <h3>Pending</h3>
              <div class="value" style="color: #fb9200;">${pending}</div>
            </div>
            <div class="summary-card">
              <h3>Refuted</h3>
              <div class="value" style="color: #ef4444;">${refuted}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Challan ID</th>
                <th>Vehicle</th>
                <th>Violation</th>
                <th>Location</th>
                <th class="text-right">Fine Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${challans
                .map(
                  (c) => `
                <tr>
                  <td><strong>${c.challanId}</strong></td>
                  <td>${c.vehicle.vehicleNumber}</td>
                  <td>${c.violation.type.replace(/_/g, ' ')}</td>
                  <td>${c.location.junctionName}</td>
                  <td class="text-right"><strong>₹ ${c.fine.totalAmount.toLocaleString('en-IN')}</strong></td>
                  <td>
                    <span class="status-${c.status.toLowerCase()}">
                      ${c.status}
                    </span>
                  </td>
                  <td>${safeFormat(c.issuedAt, 'date')}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #1f2937;">
            <div style="display: flex; justify-content: flex-end; gap: 40px;">
              <div>
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">TOTAL FINE AMOUNT</div>
                <div style="font-size: 24px; font-weight: 700; color: #1f2937;">
                  ₹ ${totalFines.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

        </div>
    </body>
    </html>
  `;

  return html;
}
