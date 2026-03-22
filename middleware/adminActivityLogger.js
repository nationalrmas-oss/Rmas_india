// Admin Activity Logger Middleware
// Logs all POST requests to admin routes for audit trail

const { logAuditAction } = require('../utils/auditUtils');

// Routes that already have explicit logging (skip these)
const ALREADY_LOGGED_ROUTES = [
    '/admin/membership-applications/:id/verify',
    '/admin/membership-applications/:id/approve',
    '/admin/membership-applications/:id/reject',
    '/admin/membership-applications/:id/assign-role',
    '/admin/approve-id-card/:memberId',
    '/certificate/:membershipId',
    '/joining-letter/:membershipId',
    '/membership-kit/:membershipId',
    '/admin/login',
    '/admin/logout',
];

// Action mappings for better audit trail
const ACTION_MAP = {
    '/admin/membership-applications/:id/verify': 'Verify',
    '/admin/membership-applications/:id/approve': 'Approve',
    '/admin/membership-applications/:id/reject': 'Reject',
    '/admin/membership-applications/:id/assign-role': 'Assign Role',
    '/admin/approve-id-card/:memberId': 'Approve ID Card',
    '/admin/users/add': 'Create Admin',
    '/admin/users/:id/edit': 'Update Admin',
    '/admin/users/:id/delete': 'Delete Admin',
    '/admin/users/:id/activate': 'Activate Admin',
    '/admin/users/:id/deactivate': 'Deactivate Admin',
};

function getActionFromPath(pathname) {
    // Check exact match first
    if (ACTION_MAP[pathname]) {
        return ACTION_MAP[pathname];
    }
    
    // Check partial match for dynamic routes
    for (const [pattern, action] of Object.entries(ACTION_MAP)) {
        // Replace :id or :memberId with regex wildcard
        const regexPattern = pattern.replace(/:id|:memberId/g, '[^/]+');
        const regex = new RegExp('^' + regexPattern + '$');
        if (regex.test(pathname)) {
            return action;
        }
    }
    
    // Default: extract action from path
    const pathParts = pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
}

const adminActivityLogger = async (req, res, next) => {
    // Only log POST, PUT, DELETE requests
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
        return next();
    }
    
    // Skip if not admin
    if (!req.session || !req.session.adminId) {
        return next();
    }
    
    // Skip routes that already have explicit logging
    const pathname = req.path;
    
    const isAlreadyLogged = ALREADY_LOGGED_ROUTES.some(route => {
        const pattern = route.replace(/:id|:memberId/g, '[^/]+');
        const regex = new RegExp('^' + pattern + '$');
        return regex.test(pathname);
    });
    
    if (isAlreadyLogged) {
        return next();
    }
    
    try {
        // Get action name
        let action = getActionFromPath(pathname);
        
        // Determine target info
        let targetId = null;
        let targetType = 'Admin';
        let targetName = null;
        let details = {};
        
        // Extract ID from path if present
        const paramId = req.params.id || req.params.memberId;
        
        if (paramId) {
            targetId = paramId;
        }
        
        // Add request body info to details (sanitized)
        if (req.body && Object.keys(req.body).length > 0) {
            const sanitizedBody = Object.assign({}, req.body);
            // Remove sensitive data
            delete sanitizedBody.password;
            delete sanitizedBody.otp;
            if (Object.keys(sanitizedBody).length > 0) {
                details = sanitizedBody;
            }
        }
        
        // Log the action
        await logAuditAction({
            req,
            action: action,
            targetId: targetId,
            targetType: targetType,
            targetName: targetName,
            details: details
        });
        
        console.log('Admin Activity Logged: ' + action + ' by ' + (req.session.admin ? req.session.admin.fullName : 'Unknown'));
        
    } catch (err) {
        // Don't block the request if logging fails
        console.error('Admin Activity Logger Error:', err.message);
    }
    
    next();
};

module.exports = { adminActivityLogger };
