import { jsPDF } from 'jspdf';
import type { AuditEvent, Case, Patient } from './state';
import { aiResultLabel } from './services/aiAnalysis';

const DISCLAIMER = 'DRISHTI DR is a screening and decision-support prototype. This output is not a clinical diagnosis.';
const PIPELINE = [
  '01 Quality Triage',
  '02 Deterministic Enhancement',
  '03 Lesion Segmentation',
  '04 Clinical Spatial Features',
  '05 Hybrid CNN + Symbolic Grading',
  '06 Explainability',
  '07 Conformal Triage',
];
const PAGE = { width: 210, height: 297, left: 20, right: 190 };
function pdfText(value: string) {
  return value.replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\u00b7/g, ' - ').replace(/[^\u0000-\u00ff]/g, '?');
}

function line(doc: jsPDF, y: number) {
  doc.setDrawColor(220, 229, 235);
  doc.line(PAGE.left, y, PAGE.right, y);
}

function wrapped(doc: jsPDF, text: string, x: number, y: number, width = 170, size = 10) {
  doc.setFontSize(size);
  const rows = doc.splitTextToSize(pdfText(text || 'Not recorded'), width) as string[];
  doc.text(rows, x, y);
  return y + rows.length * (size * 0.48) + 2;
}

function pageHeader(doc: jsPDF, section: string, page: number, caseId: string) {
  doc.setFillColor(22, 67, 82);
  doc.rect(0, 0, PAGE.width, 13, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DRISHTI DR', PAGE.left, 8.7);
  doc.setFont('helvetica', 'normal');
  doc.text(`CASE ${caseId}`, PAGE.right, 8.7, { align: 'right' });
  doc.setTextColor(32, 48, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(section, PAGE.left, 28);
  line(doc, 34);
  doc.setTextColor(46, 63, 72);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(106, 121, 129);
  doc.text(`${DISCLAIMER}  -  Page ${page} of 6`, PAGE.left, 287);
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setTextColor(22, 67, 82);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), PAGE.left, y);
  doc.setTextColor(39, 53, 61);
  return y + 7;
}

function field(doc: jsPDF, label: string, value: string | number | undefined, x: number, y: number, width = 78) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(103, 119, 127);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(39, 53, 61);
  const rows = doc.splitTextToSize(pdfText(String(value ?? 'Not recorded')), width) as string[];
  doc.text(rows, x, y + 6);
}

function embeddedImage(doc: jsPDF, source: string, x: number, y: number, width: number, height: number) {
  const properties = doc.getImageProperties(source);
  const scale = Math.min(width / properties.width, height / properties.height);
  const drawWidth = properties.width * scale;
  const drawHeight = properties.height * scale;
  const format = source.startsWith('data:image/png') ? 'PNG' : 'JPEG';
  doc.addImage(source, format, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight, undefined, 'FAST');
}

function eyePage(doc: jsPDF, caseRecord: Case, side: 'right' | 'left', page: number) {
  const eyeName = side === 'right' ? 'RIGHT EYE' : 'LEFT EYE';
  pageHeader(doc, eyeName, page, caseRecord.id);
  const unavailable = caseRecord.eye.toLowerCase().includes(`${side === 'right' ? 'right' : 'left'} eye unavailable`);
  if (unavailable) {
    doc.setFillColor(247, 249, 249);
    doc.roundedRect(PAGE.left, 47, 170, 43, 3, 3, 'F');
    doc.setTextColor(22, 67, 82);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SINGLE-EYE ASSESSMENT', 28, 62);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(46, 63, 72);
    doc.setFontSize(10);
    doc.text(`${eyeName === 'RIGHT EYE' ? 'Right' : 'Left'} eye unavailable in this screening.`, 28, 71);
    doc.text('Single-eye evidence is limited and is not equivalent to two-eye assessment.', 28, 80);
  }

  const y = unavailable ? 104 : 52;
  const original = caseRecord.imageData?.[side];
  doc.setFillColor(247, 249, 249);
  doc.setDrawColor(220, 229, 235);
  doc.roundedRect(PAGE.left, y, 170, 105, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 67, 82);
  doc.text('ORIGINAL IMAGE', PAGE.left + 8, y + 11);
  if (original) {
    try {
      embeddedImage(doc, original, PAGE.left + 10, y + 16, 150, 80);
    } catch {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(91, 105, 112);
      doc.text('Image file could not be embedded.', PAGE.left + 8, y + 39);
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(91, 105, 112);
    doc.text('No retinal image is stored for this eye.', PAGE.left + 8, y + 39);
    doc.text('This report does not substitute an illustration for a missing capture.', PAGE.left + 8, y + 47);
  }
  let nextY = sectionTitle(doc, 'Additional image evidence', y + 119);
  nextY = wrapped(doc, 'Enhanced, segmentation, and explanation images are not separately stored in this case.', PAGE.left, nextY, 165, 9);
  wrapped(doc, `Eye availability recorded in the case: ${caseRecord.eye}.`, PAGE.left, nextY + 1, 165, 9);
}

export async function generateCaseReport(caseRecord: Case, patient: Patient | undefined, auditEvents: AuditEvent[]): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const patientName = patient?.name || 'Not recorded';
  const audit = auditEvents.filter(event => event.caseId === caseRecord.id).sort((a, b) => a.timestamp - b.timestamp);

  // Page 1: case and patient summary
  pageHeader(doc, 'SCREENING REPORT', 1, caseRecord.id);
  doc.setTextColor(106, 121, 129);
  doc.setFontSize(10);
  doc.text('Case and patient details', PAGE.left, 45);
  line(doc, 50);
  const left = PAGE.left;
  const right = 112;
  field(doc, 'Case ID', caseRecord.id, left, 62);
  field(doc, 'Patient ID', patient?.id, right, 62);
  field(doc, 'Patient name', patientName, left, 84);
  field(doc, 'Approximate age', patient?.age ? `${patient.age} years` : undefined, right, 84);
  field(doc, 'Gender', patient?.gender, left, 106);
  field(doc, 'Village / address', patient?.village, right, 106);
  field(doc, 'Screening date', caseRecord.created, left, 128);
  field(doc, 'Screening worker', caseRecord.screeningWorker, right, 128);
  field(doc, 'Case status', caseRecord.reviewStatus === 'COMPLETED' ? 'Review completed' : caseRecord.reviewStatus === 'REVIEW_REQUIRED' || caseRecord.status === 'REVIEW_REQUIRED' ? 'Review required' : caseRecord.aiResult ? aiResultLabel(caseRecord.aiResult.status) : caseRecord.status, left, 150, 160);
  field(doc, 'Source PHC', caseRecord.sourcePhc, right, 150);
  doc.setFillColor(243, 247, 247);
  doc.roundedRect(PAGE.left, 190, 170, 37, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 67, 82);
  doc.setFontSize(9);
  doc.text('PROTOTYPE DISCLAIMER', PAGE.left + 8, 201);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(46, 63, 72);
  wrapped(doc, DISCLAIMER, PAGE.left + 8, 209, 152, 10);
  doc.setFontSize(9);
  doc.setTextColor(106, 121, 129);
  doc.text('This report contains only details stored in the local demo case.', PAGE.left, 247);

  // Pages 2-3: captured eye images, with explicit missing-image handling
  doc.addPage(); eyePage(doc, caseRecord, 'right', 2);
  doc.addPage(); eyePage(doc, caseRecord, 'left', 3);

  // Page 4: only case recommendation and workflow stages represented by this prototype
  doc.addPage();
  pageHeader(doc, 'AI ANALYSIS', 4, caseRecord.id);
  let y = 48;
  y = sectionTitle(doc, 'Stored screening recommendation', y);
  y = wrapped(doc, (caseRecord.aiResult ? aiResultLabel(caseRecord.aiResult.status) : caseRecord.aiRecommendation) || caseRecord.priority || 'Not recorded', PAGE.left, y, 164, 12);
  y += 5;
  y = sectionTitle(doc, 'Demonstration pipeline', y);
  for (const stage of PIPELINE) {
    doc.setDrawColor(220, 229, 235);
    doc.roundedRect(PAGE.left, y - 4, 170, 17, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(39, 53, 61);
    doc.text(stage, PAGE.left + 5, y + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(106, 121, 129);
    doc.text('Workflow step shown; no stage-specific finding stored.', PAGE.left + 5, y + 8);
    y += 21;
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(106, 121, 129);
  wrapped(doc, 'No confidence values, performance metrics, or additional clinical findings are recorded in this report.', PAGE.left, 222, 165, 9);

  // Page 5: keep recommendation and human decision distinct
  doc.addPage();
  pageHeader(doc, 'HUMAN REVIEW', 5, caseRecord.id);
  y = 49;
  for (const [label, value] of [
    ['AI recommendation', (caseRecord.aiResult ? aiResultLabel(caseRecord.aiResult.status) : caseRecord.aiRecommendation) || caseRecord.priority || 'Not recorded'],
    ['Doctor decision', caseRecord.doctorDecision || 'Not recorded'],
    ['Review action', caseRecord.reviewAction ? caseRecord.reviewAction.replace(/_/g, ' ') : 'Not recorded'],
    ['Doctor note', caseRecord.doctorNote || 'Not recorded'],
    ['Review timestamp', caseRecord.reviewTimestamp ? new Date(caseRecord.reviewTimestamp).toLocaleString() : 'Not recorded'],
  ]) {
    y = sectionTitle(doc, label, y);
    y = wrapped(doc, value, PAGE.left, y, 164, 10) + 7;
  }
  doc.setFillColor(243, 247, 247);
  doc.roundedRect(PAGE.left, 239, 170, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(46, 63, 72);
  doc.text('Specialist review is a human decision recorded separately from the screening recommendation.', PAGE.left + 6, 251);

  // Page 6: case-specific shared audit events only
  doc.addPage();
  pageHeader(doc, 'AUDIT TIMELINE', 6, caseRecord.id);
  y = 49;
  if (audit.length) {
    for (const event of audit) {
      doc.setFillColor(22, 116, 111);
      doc.circle(PAGE.left + 3, y - 1, 1.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(39, 53, 61);
      doc.text(event.label, PAGE.left + 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(106, 121, 129);
      doc.text(event.date, PAGE.left + 10, y + 6);
      y += 16;
    }
  } else {
    y = wrapped(doc, 'No audit events are recorded for this case.', PAGE.left, y, 165, 10);
  }
  doc.setFillColor(243, 247, 247);
  doc.roundedRect(PAGE.left, 235, 170, 28, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(22, 67, 82);
  doc.text('PROTOTYPE DISCLAIMER', PAGE.left + 6, 245);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(46, 63, 72);
  wrapped(doc, DISCLAIMER, PAGE.left + 6, 252, 157, 8);

  return doc.output('blob');
}

export async function downloadCaseReport(caseRecord: Case, patient: Patient | undefined, auditEvents: AuditEvent[]) {
  const blob = await generateCaseReport(caseRecord, patient, auditEvents);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `DRISHTI-DR-${caseRecord.id}-screening-report.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return blob.size;
}
