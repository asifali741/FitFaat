import Doctor from '../models/Doctor.js';
import User from '../models/User.js';

// @route   GET /api/admin/verify
// @desc    Verify if user is admin
// @access  Private
export const verifyAdmin = async (req, res) => {
  try {
    // Get user from token
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No user found in token'
      });
    }

    // Check if user exists and is admin
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is admin (using email from .env)
    const adminEmail = process.env.VITE_ADMIN_EMAIL || 'admin@gmail.com';
    const isAdmin = user.email === adminEmail;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can access this portal'
      });
    }

    res.json({
      success: true,
      admin: {
        id: user._id,
        email: user.email,
        username: user.username,
        name: user.userInfo?.name || 'Admin User',
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @route   GET /api/admin/users
// @desc    Get all users with optional pagination and search
// @access  Private (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { 'userInfo.name': { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Format user data
    const formattedUsers = users.map(user => ({
      id: user._id,
      email: user.email,
      username: user.username,
      name: user.userInfo?.name || 'N/A',
      status: user.isActive !== false ? 'Active' : 'Inactive',
      createdAt: user.createdAt,
      isOnboardingComplete: user.isOnboardingComplete,
      isDocregister: user.isDocregister,
      appointmentsCount: user.appointmentsBooked?.length || 0
    }));

    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// @route   GET /api/admin/users/:id
// @desc    Get specific user details
// @access  Private (Admin only)
export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('appointmentsBooked.doctorId', 'personalInfo.firstName personalInfo.lastName');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        userInfo: user.userInfo,
        appointmentsBooked: user.appointmentsBooked,
        isOnboardingComplete: user.isOnboardingComplete,
        isDocregister: user.isDocregister
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details'
    });
  }
};

// @route   GET /api/admin/doctors
// @desc    Get all doctor applications with optional filtering
// @access  Private (Admin only)
export const getAllDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search and filter query
    let query = {};
    
    if (search) {
      query = {
        $or: [
          { 'personalInfo.email': { $regex: search, $options: 'i' } },
          { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
          { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
          { 'professionalInfo.licenseNumber': { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Filter by status
    if (status !== 'all') {
      query.status = status;
    }

    // Get total count
    const total = await Doctor.countDocuments(query);

    // Get doctors with pagination
    const doctors = await Doctor.find(query)
      .populate('userId', 'email username')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Format doctor data
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor._id,
      userId: doctor.userId?._id,
      userEmail: doctor.userId?.email,
      personalInfo: doctor.personalInfo,
      professionalInfo: doctor.professionalInfo,
      jobInfo: doctor.jobInfo,
      status: doctor.status,
      isVerified: doctor.isVerified,
      createdAt: doctor.createdAt,
      approvedAt: doctor.approvedAt,
      adminNotes: doctor.adminNotes,
      rating: doctor.rating
    }));

    res.json({
      success: true,
      data: formattedDoctors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors'
    });
  }
};

// @route   GET /api/admin/doctors/:id
// @desc    Get specific doctor details
// @access  Private (Admin only)
export const getDoctorDetails = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'email username');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: doctor._id,
        userId: doctor.userId?._id,
        userEmail: doctor.userId?.email,
        personalInfo: doctor.personalInfo,
        professionalInfo: doctor.professionalInfo,
        jobInfo: doctor.jobInfo,
        languages: doctor.languages,
        verificationDocuments: doctor.verificationDocuments,
        status: doctor.status,
        isVerified: doctor.isVerified,
        isActive: doctor.isActive,
        createdAt: doctor.createdAt,
        updatedAt: doctor.updatedAt,
        approvedAt: doctor.approvedAt,
        adminNotes: doctor.adminNotes,
        rating: doctor.rating
      }
    });
  } catch (error) {
    console.error('Get doctor details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor details'
    });
  }
};

// @route   PUT /api/admin/doctors/:id/approve
// @desc    Approve a doctor application
// @access  Private (Admin only)
export const approveDoctor = async (req, res) => {
  try {
    const { adminNotes = '' } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        isVerified: true,
        approvedAt: new Date(),
        adminNotes: adminNotes,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'email username');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor approved successfully',
      data: {
        id: doctor._id,
        personalInfo: doctor.personalInfo,
        status: doctor.status,
        isVerified: doctor.isVerified,
        approvedAt: doctor.approvedAt
      }
    });
  } catch (error) {
    console.error('Approve doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving doctor'
    });
  }
};

// @route   PUT /api/admin/doctors/:id/reject
// @desc    Reject a doctor application
// @access  Private (Admin only)
export const rejectDoctor = async (req, res) => {
  try {
    const { adminNotes = '' } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        adminNotes: adminNotes,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'email username');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor rejected successfully',
      data: {
        id: doctor._id,
        personalInfo: doctor.personalInfo,
        status: doctor.status,
        adminNotes: doctor.adminNotes
      }
    });
  } catch (error) {
    console.error('Reject doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting doctor'
    });
  }
};

// @route   PUT /api/admin/doctors/:id/suspend
// @desc    Suspend a doctor account
// @access  Private (Admin only)
export const suspendDoctor = async (req, res) => {
  try {
    const { adminNotes = '' } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        status: 'suspended',
        isActive: false,
        adminNotes: adminNotes,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor suspended successfully',
      data: {
        id: doctor._id,
        personalInfo: doctor.personalInfo,
        status: doctor.status,
        isActive: doctor.isActive
      }
    });
  } catch (error) {
    console.error('Suspend doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error suspending doctor'
    });
  }
};

// @route   PUT /api/admin/doctors/:id/verify
// @desc    Verify a doctor
// @access  Private (Admin only)
export const verifyDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor verified successfully',
      data: doctor
    });
  } catch (error) {
    console.error('Verify doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying doctor'
    });
  }
};

// @route   PUT /api/admin/doctors/:id/unverify
// @desc    Unverify a doctor
// @access  Private (Admin only)
export const unverifyDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isVerified: false },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor unverified successfully',
      data: doctor
    });
  } catch (error) {
    console.error('Unverify doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unverifying doctor'
    });
  }
};

// @route   PUT /api/admin/doctors/:id/block
// @desc    Block/unblock a doctor
// @access  Private (Admin only)
export const blockDoctor = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isBlocked: isBlocked || true },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: `Doctor ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: doctor
    });
  } catch (error) {
    console.error('Block doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking doctor'
    });
  }
};

// @route   PUT /api/admin/users/:id/block
// @desc    Block/unblock a user
// @access  Private (Admin only)
export const blockUser = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: isActive !== false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive === false ? 'blocked' : 'unblocked'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking user'
    });
  }
};

// @route   GET /api/admin/statistics
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
export const getStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: { $ne: false } });
    const totalDoctors = await Doctor.countDocuments();
    const approvedDoctors = await Doctor.countDocuments({ status: 'approved' });
    const pendingDoctors = await Doctor.countDocuments({ status: 'pending' });
    const rejectedDoctors = await Doctor.countDocuments({ status: 'rejected' });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers
        },
        doctors: {
          total: totalDoctors,
          approved: approvedDoctors,
          pending: pendingDoctors,
          rejected: rejectedDoctors
        }
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};
