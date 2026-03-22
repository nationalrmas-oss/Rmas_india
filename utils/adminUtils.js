// Admin Authorization & Data Filtering Utilities

/**
 * Build MongoDB filter based on admin level and location
 */
function getDataFilter(admin) {
    if (!admin.level) {
        return {};
    }

    const filter = {};

    // National and Superadmin can see all data
    if (admin.level === 'National' || admin.role === 'Superadmin') {
        return filter;
    }

    // State level - show only members from their state
    if (admin.level === 'State' && admin.location?.state) {
        filter.state = admin.location.state;
    }

    // Division level - show only members from their division
    if (admin.level === 'Division' && admin.location?.division) {
        filter.division = admin.location.division;
    }

    // District level - show only members from their district
    if (admin.level === 'District' && admin.location?.district) {
        filter.district = admin.location.district;
    }

    // Block level - show only members from their block
    if (admin.level === 'Block' && admin.location?.block) {
        filter.block = admin.location.block;
    }

    // Panchayat level - show only members from their panchayat field if stored
    if (admin.level === 'Panchayat' && admin.location?.panchayat) {
        filter.panchayat = admin.location.panchayat;
    }

    return filter;
}

/**
 * Check if admin can manage other admins
 * Only National level and Superadmin can create/delete/edit other admins
 */
function canManageAdmins(admin) {
    return admin.level === 'National' || admin.role === 'Superadmin';
}

/**
 * Check if admin can view a specific user's data
 */
function canViewAdminData(currentAdmin, targetAdmin) {
    // National and Superadmin can view all
    if (currentAdmin.level === 'National' || currentAdmin.role === 'Superadmin') {
        return true;
    }

    // Same state can view each other (State level)
    if (currentAdmin.level === 'State' && currentAdmin.location?.state === targetAdmin.location?.state) {
        return true;
    }

    // Same division can view each other
    if (currentAdmin.level === 'Division' && currentAdmin.location?.division === targetAdmin.location?.division) {
        return true;
    }

    // Same district can view each other
    if (currentAdmin.level === 'District' && currentAdmin.location?.district === targetAdmin.location?.district) {
        return true;
    }

    return false;
}

module.exports = {
    getDataFilter,
    canManageAdmins,
    canViewAdminData
};
