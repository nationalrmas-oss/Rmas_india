// Analytics API Routes
const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const User = require('../models/User');
const { isAdmin } = require('../middleware/auth');

// Get Analytics Data
router.get('/analytics', isAdmin, async (req, res) => {
    try {
        // Total Members
        const totalMembers = await Member.countDocuments();
        
        // Pending Approvals
        const pendingApprovals = await Member.countDocuments({ status: 'pending' });
        
        // Approved Members
        const approvedMembers = await Member.countDocuments({ status: 'approved' });
        
        // Today's Registrations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRegistrations = await Member.countDocuments({ 
            createdAt: { $gte: today }
        });

        // Monthly Growth (last 6 months)
        const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const monthlyGrowth = await Member.aggregate([
    {
        $match: { createdAt: { $gte: sixMonthsAgo } }
    },
    {
        $group: {
            _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
        }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
]);

// Format monthly data
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthlyLabels = monthlyGrowth.map(m => monthNames[m._id.month - 1] + ' ' + m._id.year);
const monthlyData = monthlyGrowth.map(m => m.count);

        // District Distribution (Top 10)
        const districtData = await Member.aggregate([
            { $group: { _id: '$district', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Team Type Distribution (Mahila vs Others)
        const teamTypes = await Member.aggregate([
            { $group: { _id: '$teamType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const rolesData = {
            labels: teamTypes.map(t => t._id || 'General'),
            data: teamTypes.map(t => t.count)
        };

        // Gender Distribution
        const genders = await Member.aggregate([
            { $group: { _id: '$gender', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Recent members (last 10)
        const recentMembers = await Member.find()
            .select('fullName email state createdAt updatedAt')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Format response data
        const stats = {
            totalMembers,
            pendingApprovals,
            approvedMembers,
            todayRegistrations
        };

        const monthly = {
            labels: monthlyLabels,
            data: monthlyData
        };

        const districts = {
            labels: districtData.map(d => d._id || 'Unknown'),
            data: districtData.map(d => d.count)
        };

        const roles = rolesData;

        const genderData = {
            labels: genders.map(g => 
                g._id === 'male' ? 'Male' : 
                g._id === 'female' ? 'Female' : 'Other'
            ),
            data: genders.map(g => g.count)
        };

        res.json({
            stats,
            monthly,
            districts,
            roles,
            genders: genderData,
            recentMembers
        });

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

module.exports = router;
