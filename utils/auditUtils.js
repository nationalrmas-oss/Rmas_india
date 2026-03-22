const Audit = require('../models/AuditLog');

function normalizeAction(action) {
  if (!action) return '';
  return action.toString().trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Log an audit action
 * @param {Object} params
 * @param {String} params.action - Action type (required)
 * @param {Object} params.req - Express request object (optional)
 * @param {ObjectId} params.targetId - ID of affected resource
 * @param {String} params.targetType - Type of affected resource (User, Membership, Form, Document, Other)
 * @param {String} params.targetName - Name/description of affected resource
 * @param {Object} params.details - Additional details (mixed data)
 * @param {String} params.note - Optional note
 * @param {String} params.performedByEmail - Override performedByEmail
 * @param {String} params.performedByName - Override performedByName
 * @param {String} params.performedByRole - Override performedByRole
 * @param {String} params.performedByLevel - Override performedByLevel
 * @param {String} params.performedByLevelId - Override performedByLevelId
 * @returns {Promise<Object|null>} - The created audit entry or null on failure
 */
async function logAction(params) {
  try {
    const {
      action,
      req,
      targetId = null,
      targetType = null,
      targetName = null,
      details = {},
      note = '',
      performedByEmail: overrideEmail,
      performedByName: overrideName,
      performedByRole: overrideRole,
      performedByLevel: overrideLevel,
      performedByLevelId: overrideLevelId
    } = params || {};

    const normalizedAction = normalizeAction(action);
    if (!normalizedAction) {
      console.error('⚠️ Audit log missing required param: action');
      return null;
    }

    const user = req?.user || req?.session?.admin || null;

    const performedByEmail = overrideEmail || user?.email || user?.username || 'anonymous';
    const performedByName = overrideName || user?.fullName || user?.name || 'Unknown';
    const performedByRole = overrideRole || (user?.role || 'guest');

    // Determine level info
    let performedByLevel = overrideLevel || 'block';
    let performedByLevelId = overrideLevelId || '';
    let level = 'block';
    let levelId = '';

    const userRole = (user?.role || '').toString().toLowerCase();
    const location = user?.location || {};

    if (userRole === 'superadmin') {
      performedByLevel = 'superadmin';
      level = 'superadmin';
    } else if (overrideLevel) {
      performedByLevel = overrideLevel;
      level = overrideLevel;
    } else if (userRole.includes('state') || location.state) {
      performedByLevel = 'state';
      level = 'state';
      performedByLevelId = performedByLevelId || location.state || '';
      levelId = levelId || location.state || '';
    } else if (location.division) {
      performedByLevel = 'division';
      performedByLevelId = performedByLevelId || location.division;
      level = 'division';
      levelId = location.division;
    } else if (location.district) {
      performedByLevel = 'district';
      performedByLevelId = performedByLevelId || location.district;
      level = 'district';
      levelId = location.district;
    } else if (location.block) {
      performedByLevel = 'block';
      performedByLevelId = performedByLevelId || location.block;
      level = 'block';
      levelId = location.block;
    }

    // Extract IP address
    const ipAddress = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      || req?.ip
      || req?.connection?.remoteAddress
      || req?.socket?.remoteAddress
      || 'unknown';

    // Extract user agent
    const userAgent = req?.get?.('user-agent') || req?.headers?.['user-agent'] || 'unknown';

    const auditEntry = new Audit({
      action: normalizedAction,
      performedBy: user?._id || null,
      performedByEmail,
      performedByName,
      performedByRole,
      performedByLevel,
      performedByLevelId,
      targetId,
      targetType,
      targetName,
      details,
      ipAddress,
      userAgent,
      level,
      levelId,
      note,
      timestamp: new Date()
    });

    await auditEntry.save();
    console.log(`✅ Audit logged: ${action} by ${performedByEmail}`);
    return auditEntry;
  } catch (err) {
    console.error('❌ Error logging audit:', err?.message || err);
    return null;
  }
}

/**
 * Get audit logs with cascade permissions
 * @param {Object} user - Current user object
 * @param {Object} filters - Query filters
 * @param {Number} page - Page number (default 1)
 * @param {Number} limit - Records per page (default 50)
 */
async function getAuditLogs(user, filters = {}, page = 1, limit = 50) {
  try {
    // Support backwards compatibility when called with a single options object
    if (user && typeof user === 'object' && !user.role && !user._id) {
      const opts = user;
      filters = opts;
      page = opts.page || 1;
      limit = opts.limit || 50;
      user = null;
    }

    const query = {};

    // Apply cascade permissions
    if (user?.role?.toString().toLowerCase() !== 'superadmin') {
      const role = (user?.role || '').toString().toLowerCase();
      const loc = user?.location || {};

      if (['state_president', 'state_secretary', 'state_media_incharge', 'president', 'secretary', 'media incharge'].includes(role)) {
        // State users can see state and below
        query.$or = [
          { level: 'state', levelId: loc.state },
          { performedByLevel: 'state', performedByLevelId: loc.state },
          { level: 'division', levelId: loc.division },
          { level: 'district', levelId: loc.district },
          { level: 'block', levelId: loc.block }
        ].filter(Boolean);
      } else if (loc.division) {
        // Division users can see division and below
        query.$or = [
          { level: 'division', levelId: loc.division },
          { performedByLevel: 'division', performedByLevelId: loc.division },
          { level: 'district', levelId: loc.district },
          { level: 'block', levelId: loc.block }
        ].filter(Boolean);
      } else if (loc.district) {
        // District users can see their district
        query.$or = [
          { level: 'district', levelId: loc.district },
          { performedByLevel: 'district', performedByLevelId: loc.district },
          { level: 'block', levelId: loc.block }
        ].filter(Boolean);
      } else if (loc.block) {
        // Block level - only their own logs
        query.levelId = user?._id?.toString();
      }
    }

    // Apply additional filters
    if (filters.action) {
      query.action = filters.action;
    }
    if (filters.performedBy) {
      query.performedByEmail = filters.performedBy;
    }
    if (filters.targetType) {
      query.targetType = filters.targetType;
    }
    if (filters.level) {
      query.level = filters.level;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDate;
      }
    }

    if (filters.search) {
      const searchClause = {
        $or: [
          { performedByEmail: new RegExp(filters.search, 'i') },
          { performedByName: new RegExp(filters.search, 'i') },
          { targetName: new RegExp(filters.search, 'i') }
        ]
      };

      if (query.$or) {
        // Preserve the existing permission-based $or by combining with search filters
        query.$and = [{ $or: query.$or }, searchClause];
        delete query.$or;
      } else {
        query.$or = searchClause.$or;
      }
    }

    const skip = (page - 1) * limit;

    const total = await Audit.countDocuments(query);
    const logs = await Audit.find(query)
      .populate('performedBy', 'fullName email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  } catch (err) {
    console.error('❌ Error fetching audit logs:', err?.message || err);
    return {
      logs: [],
      pagination: { page, limit, total: 0, pages: 0, hasNext: false, hasPrev: false }
    };
  }
}

module.exports = {
  logAction,
  logAuditAction: logAction,
  getAuditLogs,
  Audit
};
