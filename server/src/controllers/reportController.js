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
      case 'monthly-income':
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        reportData = await ReportModel.getMonthlyIncomeReport(month, year);
        break;
      case 'annual-income':
        const reportYear = parseInt(req.query.year) || new Date().getFullYear();
        reportData = await ReportModel.getAnnualIncomeReport(reportYear);
        break;
      case 'customer-growth':
        reportData = await ReportModel.getCustomerGrowthReport(startDate, endDate);
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
      case 'veterinarian-performance':
        reportData = await ReportModel.getVeterinarianPerformance(startDate, endDate);
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
        case 'monthly-income':
          const month = parseInt(req.query.month) || new Date().getMonth() + 1;
          const year = parseInt(req.query.year) || new Date().getFullYear();
          const monthlyData = await ReportModel.getMonthlyIncomeReport(month, year);
          reportData = monthlyData.dailyBreakdown;
          break;
        case 'annual-income':
          const reportYear = parseInt(req.query.year) || new Date().getFullYear();
          reportData = await ReportModel.getAnnualIncomeReport(reportYear);
          break;
        case 'customer-growth':
          reportData = await ReportModel.getCustomerGrowthReport(startDate, endDate);
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
        case 'veterinarian-performance':
          reportData = await ReportModel.getVeterinarianPerformance(startDate, endDate);
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

/**
 * Export report to PDF format
 */
export const exportReportPDF = async (req, res) => {
  try {
    const { startDate, endDate, reportType, category } = req.query;

    // Validate dates
    if (!startDate || !endDate || !reportType || !category) {
      return res.status(400).json({ 
        error: 'Required parameters missing' 
      });
    }

    let reportData;
    let reportTitle = '';

    // Get the appropriate report data
    if (category === 'financial') {
      switch (reportType) {
        case 'revenue-summary':
          reportData = await ReportModel.getRevenueSummary(startDate, endDate);
          reportTitle = 'Revenue Summary Report';
          break;
        case 'payments-by-method':
          reportData = await ReportModel.getPaymentsByMethod(startDate, endDate);
          reportTitle = 'Payments by Method Report';
          break;
        case 'outstanding-balances':
          reportData = await ReportModel.getOutstandingBalances();
          reportTitle = 'Outstanding Balances Report';
          break;
        case 'revenue-by-service':
          reportData = await ReportModel.getRevenueByService(startDate, endDate);
          reportTitle = 'Revenue by Service Report';
          break;
        case 'top-customers':
          reportData = await ReportModel.getTopCustomers(startDate, endDate, 50);
          reportTitle = 'Top Customers Report';
          break;
        case 'monthly-income':
          const month = parseInt(req.query.month) || new Date().getMonth() + 1;
          const year = parseInt(req.query.year) || new Date().getFullYear();
          const monthlyData = await ReportModel.getMonthlyIncomeReport(month, year);
          reportData = [monthlyData.summary];
          reportTitle = `Monthly Income Report - ${month}/${year}`;
          break;
        case 'annual-income':
          const reportYear = parseInt(req.query.year) || new Date().getFullYear();
          reportData = await ReportModel.getAnnualIncomeReport(reportYear);
          reportTitle = `Annual Income Report - ${reportYear}`;
          break;
        case 'customer-growth':
          reportData = await ReportModel.getCustomerGrowthReport(startDate, endDate);
          reportTitle = 'Customer Growth Report';
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
    } else if (category === 'operational') {
      switch (reportType) {
        case 'appointment-stats':
          reportData = await ReportModel.getAppointmentStats(startDate, endDate);
          reportTitle = 'Appointment Statistics Report';
          break;
        case 'appointments-by-type':
          reportData = await ReportModel.getAppointmentsByType(startDate, endDate);
          reportTitle = 'Appointments by Type Report';
          break;
        case 'patient-visits':
          reportData = [await ReportModel.getPatientVisitStats(startDate, endDate)];
          reportTitle = 'Patient Visit Statistics Report';
          break;
        case 'inventory-usage':
          reportData = await ReportModel.getInventoryUsage(startDate, endDate);
          reportTitle = 'Inventory Usage Report';
          break;
        case 'veterinarian-performance':
          reportData = await ReportModel.getVeterinarianPerformance(startDate, endDate);
          reportTitle = 'Veterinarian Performance Report';
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Check if data exists
    if (!reportData || reportData.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified criteria' });
    }

    // Generate simple HTML for PDF conversion
    const html = generateHTMLReport(reportTitle, reportData, startDate, endDate);
    const filename = `${reportType}_${startDate}_${endDate}.pdf`;

    // For now, send HTML that can be converted to PDF on client side
    // In production, you'd use a library like puppeteer or pdfkit
    res.json({
      success: true,
      html: html,
      filename: filename,
      message: 'Please use browser print to PDF functionality'
    });
  } catch (error) {
    console.error('Error exporting PDF report:', error);
    res.status(500).json({ 
      error: 'Failed to export PDF report' 
    });
  }
};

/**
 * Helper function to generate HTML report
 */
function generateHTMLReport(title, data, startDate, endDate) {
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
        }
        .date-range {
          color: #7f8c8d;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background-color: #3498db;
          color: white;
          padding: 12px;
          text-align: left;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f5f5f5;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #7f8c8d;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="date-range">
        Report Period: ${startDate} to ${endDate}
      </div>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${headers.map(h => `<td>${row[h] !== null && row[h] !== undefined ? row[h] : ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>VetCarePro - Veterinary Management System</p>
      </div>
    </body>
    </html>
  `;
  
  return html;
}
