import { getAuditLogs, getDistinctActions, getDistinctTables } from '../models/auditLogModel.js';

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
