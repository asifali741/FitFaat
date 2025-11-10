import Doctor from '../models/Doctor.js';

// @desc    Submit doctor registration
// @route   POST /api/doctors/register
// @access  Private
export const submitDoctorRegistration = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's email from authenticated user
    const user = await User.findById(userId).select('email');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if doctor already exists for this user
    const existingDoctor = await Doctor.findOne({ userId });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a doctor registration application'
      });
    }

    const {
      firstName,
      lastName,
      phoneNumber,
      age,
      gender,
      bio,
      licenseNumber,
      licenseAuthority,
      registrationYear,
      yearsOfExperience,
      specialization,
      qualifications,
      university,
      domain,
      jobType,
      clinicName,
      clinicAddress,
      consultationFee,
      availableDays,
      availableHours,
      consultationMode,
      languages
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'firstName', 'lastName', 'phoneNumber', 'age', 'gender',
      'licenseNumber', 'licenseAuthority', 'registrationYear', 'yearsOfExperience',
      'specialization', 'qualifications', 'university', 'domain', 'jobType', 'consultationMode'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate age
    if (age < 18 || age > 80) {
      return res.status(400).json({
        success: false,
        message: 'Age must be between 18 and 80'
      });
    }

    // Validate years of experience
    if (yearsOfExperience < 0 || yearsOfExperience > 70) {
      return res.status(400).json({
        success: false,
        message: 'Years of experience must be between 0 and 70'
      });
    }

    // Create new doctor record
    const doctor = await Doctor.create({
      userId,
      personalInfo: {
        firstName,
        lastName,
        email: user.email,
        phoneNumber,
        age,
        gender,
        bio
      },
      professionalInfo: {
        licenseNumber,
        licenseAuthority,
        registrationYear,
        yearsOfExperience,
        specialization,
        qualifications,
        university,
        domain
      },
      jobInfo: {
        jobType,
        clinicName: clinicName || null,
        clinicAddress: clinicAddress || null,
        consultationFee: consultationFee || 0,
        availableDays: availableDays || [],
        availableHours: availableHours || {},
        consultationMode
      },
      languages: languages || ['English'],
      status: 'pending',
      submittedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Doctor registration submitted successfully. Your application is under review.',
      doctor: {
        id: doctor._id,
        status: doctor.status,
        submittedAt: doctor.submittedAt
      }
    });
  } catch (error) {
    console.error('Doctor registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit doctor registration'
    });
  }
};

// @desc    Get doctor registration status
// @route   GET /api/doctors/status
// @access  Private
export const getDoctorStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const doctor = await Doctor.findOne({ userId }).select('status submittedAt approvedAt adminNotes personalInfo.firstName personalInfo.lastName');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'No doctor application found'
      });
    }

    res.json({
      success: true,
      doctor: {
        id: doctor._id,
        status: doctor.status,
        submittedAt: doctor.submittedAt,
        approvedAt: doctor.approvedAt,
        adminNotes: doctor.adminNotes,
        name: `${doctor.personalInfo.firstName} ${doctor.personalInfo.lastName}`
      }
    });
  } catch (error) {
    console.error('Get doctor status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor status'
    });
  }
};

// @desc    Get all doctors (admin)
// @route   GET /api/doctors
// @access  Private/Admin
export const getAllDoctors = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const doctors = await Doctor.find(query)
      .select('-verificationDocuments')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ submittedAt: -1 });

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      doctors,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctors'
    });
  }
};

// @desc    Approve/Reject doctor registration
// @route   PUT /api/doctors/:id/review
// @access  Private/Admin
export const reviewDoctorApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or rejected'
      });
    }

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      {
        status,
        adminNotes,
        approvedAt: status === 'approved' ? new Date() : null,
        isVerified: status === 'approved'
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
      message: `Doctor application ${status}`,
      doctor
    });
  } catch (error) {
    console.error('Review doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review doctor application'
    });
  }
};

// @desc    Get doctor profile
// @route   GET /api/doctors/:id
// @access  Public
export const getDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id)
      .select('-verificationDocuments -adminNotes');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (doctor.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Doctor profile is not yet approved'
      });
    }

    res.json({
      success: true,
      doctor
    });
  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor profile'
    });
  }
};

// @desc    Update doctor profile
// @route   PUT /api/doctors/profile
// @access  Private
export const updateDoctorProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { consultationFee, availableDays, availableHours, consultationMode, bio } = req.body;

    const doctor = await Doctor.findOne({ userId });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    if (doctor.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'You can only update your profile after approval'
      });
    }

    // Update allowed fields
    if (consultationFee !== undefined) doctor.jobInfo.consultationFee = consultationFee;
    if (availableDays) doctor.jobInfo.availableDays = availableDays;
    if (availableHours) doctor.jobInfo.availableHours = availableHours;
    if (consultationMode) doctor.jobInfo.consultationMode = consultationMode;
    if (bio) doctor.personalInfo.bio = bio;

    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor profile updated successfully',
      doctor
    });
  } catch (error) {
    console.error('Update doctor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update doctor profile'
    });
  }
};
