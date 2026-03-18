import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getLabReportsByPet,
  getLabReportById,
  createLabReport,
  deleteLabReport
} from '../models/labReportModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const listLabReports = async (req, res) => {
  try {
    const { petId } = req.params;
    const reports = await getLabReportsByPet(petId);
    res.status(200).json({ status: 'success', reports });
  } catch (err) {
    console.error('❌ listLabReports error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch lab reports' });
  }
};

export const uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const { petId } = req.params;
    const { report_name, report_type, notes, related_case_id } = req.body;

    if (!report_name || !report_type) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ status: 'error', message: 'Report name and type are required' });
    }

    const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
    const filePath = `lab-reports/${req.file.filename}`;

    const report = await createLabReport({
      petId,
      reportName: report_name,
      reportType: report_type,
      filePath,
      fileType,
      notes,
      relatedCaseId: related_case_id || null,
      uploadedBy: req.user.user_id
    });

    res.status(201).json({ status: 'success', report });
  } catch (err) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    console.error('❌ uploadReport error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to upload lab report' });
  }
};

export const viewReport = async (req, res) => {
  try {
    const report = await getLabReportById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ status: 'error', message: 'Lab report not found' });
    }

    const filePath = path.join(__dirname, '../../uploads', report.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 'error', message: 'File not found on server' });
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error('❌ viewReport error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve report file' });
  }
};

export const removeLabReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { role } = req.user;

    if (role !== 'admin' && role !== 'veterinarian') {
      return res.status(403).json({ status: 'error', message: 'Only admins and veterinarians can delete lab reports' });
    }

    const deleted = await deleteLabReport(reportId);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Lab report not found' });
    }

    const filePath = path.join(__dirname, '../../uploads', deleted.file_path);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    res.status(200).json({ status: 'success', message: 'Lab report deleted successfully' });
  } catch (err) {
    console.error('❌ removeLabReport error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete lab report' });
  }
};
