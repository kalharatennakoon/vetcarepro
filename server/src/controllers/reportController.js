import ReportModel from '../models/reportModel.js';

/**
 * Get financial reports
 */
export const getFinancialReports = async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format' 
      });
    }

    if (start > end) {
      return res.status(400).json({ 
        error: 'Start date must be before end date' 
      });
    }

    let reportData;

    switch (reportType) {
      case 'revenue-summary':
        reportData = await ReportModel.getRevenueSummary(startDate, endDate);
        break;
      case 'payments-by-method':
        reportData = await ReportModel.getPaymentsByMethod(startDate, endDate);
        break;
      case 'outstanding-balances':
        reportData = await ReportModel.getOutstandingBalances();
        break;
      case 'revenue-by-service':
        reportData = await ReportModel.getRevenueByService(startDate, endDate);
        break;
      case 'top-customers':
        const limit = parseInt(req.query.limit) || 10;
        reportData = await ReportModel.getTopCustomers(startDate, endDate, limit);
        break;
      case 'monthly-trend':
        reportData = await ReportModel.getMonthlyRevenueTrend();
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid report type' 
        });
    }

    res.json({
      reportType,
      startDate,
      endDate,
      data: reportData
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ 
      error: 'Failed to generate financial report' 
    });
  }
};

/**
 * Get operational reports
 */
export const getOperationalReports = async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format' 
      });
    }

    if (start > end) {
      return res.status(400).json({ 
        error: 'Start date must be before end date' 
      });
    }

    let reportData;

    switch (reportType) {
      case 'appointment-stats':
        reportData = await ReportModel.getAppointmentStats(startDate, endDate);
        break;
      case 'appointments-by-type':
        reportData = await ReportModel.getAppointmentsByType(startDate, endDate);
        break;
      case 'patient-visits':
        reportData = await ReportModel.getPatientVisitStats(startDate, endDate);
        break;
      case 'inventory-usage':
        reportData = await ReportModel.getInventoryUsage(startDate, endDate);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid report type' 
        });
    }

    res.json({
      reportType,
      startDate,
      endDate,
      data: reportData
    });
  } catch (error) {
    console.error('Error generating operational report:', error);
    res.status(500).json({ 
      error: 'Failed to generate operational report' 
    });
  }
};

/**
 * Get dashboard summary
 */
export const getDashboardSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format' 
      });
    }

    if (start > end) {
      return res.status(400).json({ 
        error: 'Start date must be before end date' 
      });
    }

    const summary = await ReportModel.getDashboardSummary(startDate, endDate);

    res.json({
      startDate,
      endDate,
      data: summary
    });
  } catch (error) {
    console.error('Error generating dashboard summary:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate dashboard summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Export report to CSV format
 */
export const exportReport = async (req, res) => {
  try {
    const { startDate, endDate, reportType, category } = req.query;

    // Validate dates
    if (!startDate || !endDate || !reportType || !category) {
      return res.status(400).json({ 
        error: 'Required parameters missing' 
      });
    }

    let reportData;

    // Get the appropriate report data
    if (category === 'financial') {
      switch (reportType) {
        case 'revenue-summary':
          reportData = await ReportModel.getRevenueSummary(startDate, endDate);
          break;
        case 'payments-by-method':
          reportData = await ReportModel.getPaymentsByMethod(startDate, endDate);
          break;
        case 'outstanding-balances':
          reportData = await ReportModel.getOutstandingBalances();
          break;
        case 'revenue-by-service':
          reportData = await ReportModel.getRevenueByService(startDate, endDate);
          break;
        case 'top-customers':
          reportData = await ReportModel.getTopCustomers(startDate, endDate, 50);
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
    } else if (category === 'operational') {
      switch (reportType) {
        case 'appointment-stats':
          reportData = await ReportModel.getAppointmentStats(startDate, endDate);
          break;
        case 'appointments-by-type':
          reportData = await ReportModel.getAppointmentsByType(startDate, endDate);
          break;
        case 'patient-visits':
          reportData = [await ReportModel.getPatientVisitStats(startDate, endDate)];
          break;
        case 'inventory-usage':
          reportData = await ReportModel.getInventoryUsage(startDate, endDate);
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Convert to CSV
    if (!reportData || reportData.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified criteria' });
    }

    const csv = convertToCSV(reportData);
    const filename = `${reportType}_${startDate}_${endDate}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ 
      error: 'Failed to export report' 
    });
  }
};

/**
 * Helper function to convert JSON to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape values that contain commas or quotes
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}
