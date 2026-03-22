const { getMembershipFilter } = require('./index');

// Unfortunately getMembershipFilter is not exported currently, so I'll
// replicate the logic here for demonstration purposes.  We'll just copy it.

function getFilter(user) {
    if (!user) {
        return { status: { $in: ['pending','verified','approved'] } };
    }
    const role = (user.role || '').toLowerCase();
    let filter = { status: { $in: ['pending','verified','approved'] } };
    if (role === 'superadmin') return {};
    const adminDistrict = user.location ? user.location.district : user.district;
    const adminBlock = user.location ? user.location.block : user.block;
    if (!adminDistrict) {
        console.error('DEBUG: Admin has NO District assigned!');
    }
    if (role === 'secretary') {
        filter.status = { $in: ['pending','verified'] };
    } else if (role === 'president') {
        filter.status = 'verified';
    }
    if (adminDistrict) {
        filter.district = { $regex: new RegExp('^' + adminDistrict.trim() + '$', 'i') };
    }
    if (adminBlock) {
        filter.block = { $regex: new RegExp('^' + adminBlock.trim() + '$', 'i') };
    }
    return filter;
}

// simulate
const users = [
    { role: 'Secretary', location: { district: 'Patna', block: 'A' } },
    { role: 'Secretary', location: { district: 'patna' } },
    { role: 'President', location: { district: 'PATNA' } },
    { role: 'Superadmin' }
];

users.forEach(u => {
    console.log('USER:', u);
    console.log('FILTER:', getFilter(u));
});
