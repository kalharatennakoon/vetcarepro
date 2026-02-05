import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const reportService = {
  /**
   * Get financial reports
   */
  getFinancialReport: async (reportType, startDate, endDate) => {
    try {
      const response = await axios.get(`${API_URL}/reports/financial`, {
        params: { reportType, startDate, endDate },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching financial report:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get operational reports
   */
  getOperationalReport: async (reportType, startDate, endDate) => {
    try {
      const response = await axios.get(`${API_URL}/reports/operational`, {
        params: { reportType, startDate, endDate },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching operational report:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get dashboard summary
   */
  getDashboardSummary: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${API_URL}/reports/dashboard-summary`, {
        params: { startDate, endDate },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Export report to CSV
   */
  exportReport: async (category, reportType, startDate, endDate) => {
    try {
      const response = await axios.get(`${API_URL}/reports/export`, {
        params: { category, reportType, startDate, endDate },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob' // Important for file download
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get top customers report
   */
  getTopCustomers: async (startDate, endDate, limit = 10) => {
    try {
      const response = await axios.get(`${API_URL}/reports/financial`, {
        params: { 
          reportType: 'top-customers', 
          startDate, 
          endDate, 
          limit 
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching top customers:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get monthly revenue trend
   */
  getMonthlyRevenueTrend: async () => {
    try {
      const response = await axios.get(`${API_URL}/reports/financial`, {
        params: { 
          reportType: 'monthly-trend',
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching monthly revenue trend:', error);
      throw error.response?.data || error;
    }
  }
};

export default reportService;
