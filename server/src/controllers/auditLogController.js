import { getAuditLogs, getDistinctActions, getDistinctTables } from '../models/auditLogModel.js';

export const exportAuditLogs = async (req, res) => {
  try {
    const { action, table_name, user_id, date_from, date_to, search } = req.query;
    const { logs } = await getAuditLogs({ action, table_name, user_id, date_from, date_to, search });

    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const header = ['Log ID', 'Timestamp', 'Action', 'Table', 'Record ID', 'Performed By', 'Role', 'Email', 'IP Address', 'Old Values', 'New Values', 'User Agent'];
    const rows = logs.map(l => [
      l.log_id, l.timestamp, l.action, l.table_name, l.record_id ?? '',
      l.performed_by, l.performed_by_role, l.performed_by_email,
      l.ip_address, l.old_values, l.new_values, l.user_agent
    ].map(escape).join(','));

    const csv = [header.join(','), ...rows].join('\r\n');
    const filename = `system_logs_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to export audit logs' });
  }
};

export const listAuditLogs = async (req, res) => {
  try {
    const { action, table_name, user_id, date_from, date_to, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { logs, total } = await getAuditLogs({
      action,
      table_name,
      user_id,
      date_from,
      date_to,
      search,
      limit: parseInt(limit),
      offset
    });

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve audit logs' });
  }
};

export const getFilterOptions = async (req, res) => {
  try {
    const [actions, tables] = await Promise.all([getDistinctActions(), getDistinctTables()]);
    res.status(200).json({ status: 'success', data: { actions, tables } });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve filter options' });
  }
};
