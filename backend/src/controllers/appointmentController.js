import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';

/**
 * @desc    Book an appointment with a doctor
 * @route   POST /api/appointments/book
 * @access  Private
 * @body    { doctorId, date, time, price, description }
 */
export const bookAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { doctorId, date, time, price, description } = req.body;

    // Validate required fields
    if (!doctorId || !date || !time || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: doctorId, date, time, price'
      });
    }

    // Parse and validate date
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Validate time format (HH:MM AM/PM)
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
    if (!timeRegex.test(time)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM AM/PM format'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ============================================
    // CHECK APPOINTMENT LIMIT FOR FREE USERS
    // ============================================
    // Premium users (with active subscription) can book unlimited appointments
    // Free users can only book 1 active appointment
    if (!user.isPremium || user.premiumSubscription?.status !== 'active') {
      // Count active appointments (pending + confirmed)
      const activeAppointments = user.appointmentsBooked?.filter(
        apt => ['pending', 'confirmed'].includes(apt.status)
      ).length || 0;

      if (activeAppointments >= 1) {
        return res.status(429).json({
          success: false,
          message: 'Free users can only have 1 active appointment. Upgrade to premium for unlimited appointments.',
          appointmentLimitReached: true,
          activeAppointments,
          limit: 1
        });
      }
    }

    // Check if doctor exists and is approved
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (doctor.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This doctor is not available for booking'
      });
    }

    // Create date string for comparison (YYYY-MM-DD)
    const dateString = appointmentDate.toISOString().split('T')[0];

    // ============================================
    // CHECK FOR CONFLICTS - User side
    // ============================================
    // Check if this user already has an appointment at the same date/time with ANY doctor
    const userConflict = user.appointmentsBooked.some(apt => {
      const aptDateString = new Date(apt.date).toISOString().split('T')[0];
      const isActiveStatus = ['pending', 'confirmed'].includes(apt.status);
      return aptDateString === dateString && apt.time === time && isActiveStatus;
    });

    if (userConflict) {
      return res.status(400).json({
        success: false,
        message: 'You already have an appointment at this time. Please choose a different slot.'
      });
    }

    // ============================================
    // CHECK FOR CONFLICTS - Doctor side
    // ============================================
    // Check if this doctor already has a booked slot at that date/time
    const doctorConflict = doctor.bookedAppointments.some(apt => {
      const aptDateString = new Date(apt.date).toISOString().split('T')[0];
      const isActiveStatus = ['pending', 'confirmed'].includes(apt.status);
      return aptDateString === dateString && apt.time === time && isActiveStatus;
    });

    if (doctorConflict) {
      return res.status(400).json({
        success: false,
        message: 'Time slot already booked. Please choose a different slot.'
      });
    }

    // ============================================
    // CREATE APPOINTMENT ENTRY WITH SHARED ID
    // ============================================
    // Generate a shared appointment ID that will be used by both user and doctor
    const sharedAppointmentId = new mongoose.Types.ObjectId();
    
    const appointmentData = {
      _id: sharedAppointmentId, // Use the same ID for both
      doctorId,
      date: appointmentDate,
      time,
      status: 'pending',
      price: Number(price),
      description: description || '',
      bookedAt: new Date()
    };

    // Add appointment to user's appointmentsBooked array
    user.appointmentsBooked.push(appointmentData);

    // Update appointment usage tracking
    if (!user.appointmentUsage) {
      user.appointmentUsage = {
        totalAppointments: 0,
        activeAppointments: 0,
        lastBookedDate: null
      };
    }
    user.appointmentUsage.totalAppointments = (user.appointmentUsage.totalAppointments || 0) + 1;
    user.appointmentUsage.lastBookedDate = new Date();

    await user.save();

    // Add appointment to doctor's bookedAppointments array with THE SAME ID
    const doctorAppointmentData = {
      _id: sharedAppointmentId, // Same ID as user's appointment
      userId,
      date: appointmentDate,
      time,
      status: 'pending',
      price: Number(price),
      description: description || '',
      bookedAt: new Date()
    };

    doctor.bookedAppointments.push(doctorAppointmentData);
    await doctor.save();

    // Fetch the created appointment to return it
    const updatedUser = await User.findById(userId).populate('appointmentsBooked.doctorId', 'personalInfo professionalInfo');
    const createdAppointment = updatedUser.appointmentsBooked[updatedUser.appointmentsBooked.length - 1];

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: {
        id: createdAppointment._id,
        doctorId: createdAppointment.doctorId,
        date: createdAppointment.date,
        time: createdAppointment.time,
        status: createdAppointment.status,
        price: createdAppointment.price,
        description: createdAppointment.description,
        bookedAt: createdAppointment.bookedAt
      }
    });
  } catch (error) {
    console.error('Appointment booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to book appointment'
    });
  }
};

/**
 * @desc    Get user's appointments
 * @route   GET /api/appointments/my-appointments
 * @access  Private
 */
export const getUserAppointments = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select('appointmentsBooked')
      .populate('appointmentsBooked.doctorId', 'personalInfo professionalInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add lastMessageAt to each appointment
    const appointmentsWithLastMessage = await Promise.all(
      (user.appointmentsBooked || []).map(async (apt) => {
        const lastMessage = await ChatMessage.findOne({ appointmentId: apt._id.toString() })
          .sort({ createdAt: -1 })
          .select('createdAt')
          .lean();
        
        return {
          ...apt.toObject(),
          lastMessageAt: lastMessage?.createdAt || null
        };
      })
    );

    res.json({
      success: true,
      appointments: appointmentsWithLastMessage
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments'
    });
  }
};

/**
 * @desc    Get doctor's booked appointments
 * @route   GET /api/appointments/doctor/:doctorId
 * @access  Private
 */
export const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId)
      .select('bookedAppointments');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Populate user details and last message time for each appointment
    const appointmentsWithUserDetails = await Promise.all(
      (doctor.bookedAppointments || []).map(async (apt) => {
        const user = await User.findById(apt.userId).select('userInfo.name email');
        
        // Get the most recent message for this appointment
        const lastMessage = await ChatMessage.findOne({ appointmentId: apt._id.toString() })
          .sort({ createdAt: -1 })
          .select('createdAt')
          .lean();
        
        return {
          _id: apt._id,
          userId: apt.userId,
          date: apt.date,
          time: apt.time,
          status: apt.status,
          price: apt.price,
          description: apt.description,
          bookedAt: apt.bookedAt,
          userName: user?.userInfo?.name || 'Unknown',
          userEmail: user?.email || 'N/A',
          lastMessageAt: lastMessage?.createdAt || null
        };
      })
    );

    res.json({
      success: true,
      appointments: appointmentsWithUserDetails
    });
  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor appointments'
    });
  }
};

/**
 * @desc    Cancel an appointment
 * @route   PUT /api/appointments/:appointmentId/cancel
 * @access  Private
 */
export const cancelAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { appointmentId } = req.params;
    const { reason, doctorId } = req.body;

    // Validate appointmentId format
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }

    // If doctorId is provided, doctor is cancelling (rejecting)
    if (doctorId) {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }

      const doctorAptIndex = doctor.bookedAppointments.findIndex(
        apt => apt._id.toString() === appointmentId
      );

      if (doctorAptIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      const doctorAppointment = doctor.bookedAppointments[doctorAptIndex];

      if (doctorAppointment.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Appointment is already cancelled'
        });
      }

      // Update in doctor's record
      doctorAppointment.status = 'cancelled';
      await doctor.save();

      // Update in user's record
      const user = await User.findById(doctorAppointment.userId);
      if (user) {
        const userAptIndex = user.appointmentsBooked.findIndex(
          apt => apt._id.toString() === appointmentId
        );

        if (userAptIndex !== -1) {
          user.appointmentsBooked[userAptIndex].status = 'cancelled';
          await user.save();
        }
      }

      return res.json({
        success: true,
        message: 'Appointment rejected successfully',
        appointment: doctorAppointment
      });
    }

    // User is cancelling their own appointment
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const appointmentIndex = user.appointmentsBooked.findIndex(
      apt => apt._id.toString() === appointmentId
    );

    if (appointmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const appointment = user.appointmentsBooked[appointmentIndex];

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already cancelled'
      });
    }

    // Update appointment status to cancelled
    appointment.status = 'cancelled';
    await user.save();

    // Find and update the same appointment in doctor's record
    const doctor = await Doctor.findById(appointment.doctorId);
    if (doctor) {
      const doctorAptIndex = doctor.bookedAppointments.findIndex(
        apt => apt._id.toString() === appointmentId
      );

      if (doctorAptIndex !== -1) {
        doctor.bookedAppointments[doctorAptIndex].status = 'cancelled';
        await doctor.save();
      }
    }

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment'
    });
  }
};

/**
 * @desc    Approve an appointment (Doctor action)
 * @route   PUT /api/appointments/:appointmentId/approve
 * @access  Private
 */
export const approveAppointment = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const { appointmentId } = req.params;

    // Validate appointmentId format
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }

    // Find doctor and update appointment in doctor's record
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const doctorAptIndex = doctor.bookedAppointments.findIndex(
      apt => apt._id.toString() === appointmentId
    );

    if (doctorAptIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const doctorAppointment = doctor.bookedAppointments[doctorAptIndex];

    if (doctorAppointment.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already approved'
      });
    }

    // Update appointment status to confirmed in doctor's record
    doctorAppointment.status = 'confirmed';
    await doctor.save();

    // Find and update the same appointment in user's record
    const user = await User.findById(doctorAppointment.userId);
    if (user) {
      const userAptIndex = user.appointmentsBooked.findIndex(
        apt => apt.doctorId.toString() === doctorId &&
               new Date(apt.date).toISOString() === new Date(doctorAppointment.date).toISOString() &&
               apt.time === doctorAppointment.time
      );

      if (userAptIndex !== -1) {
        user.appointmentsBooked[userAptIndex].status = 'confirmed';
        await user.save();
      }
    }

    res.json({
      success: true,
      message: 'Appointment approved successfully',
      appointment: doctorAppointment
    });
  } catch (error) {
    console.error('Approve appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve appointment'
    });
  }
};
/**
 * @desc    Check appointment limit for free vs premium users
 * @route   GET /api/appointments/check-limit
 * @access  Private
 */
export const checkAppointmentLimit = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with appointment info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Premium users have unlimited appointments
    if (user.isPremium && user.premiumSubscription?.status === 'active') {
      return res.json({
        success: true,
        canBook: true,
        isPremium: true,
        activeAppointments: user.appointmentUsage?.activeAppointments || 0,
        totalAppointments: user.appointmentUsage?.totalAppointments || 0,
        appointmentLimit: 'unlimited'
      });
    }

    // Free users have 1 appointment limit
    const activeAppointments = user.appointmentsBooked?.filter(
      apt => ['pending', 'confirmed'].includes(apt.status)
    ).length || 0;

    const canBook = activeAppointments < 1;
    const remainingAppointments = Math.max(0, 1 - activeAppointments);

    return res.json({
      success: true,
      canBook,
      isPremium: false,
      activeAppointments,
      remainingAppointments,
      appointmentLimit: 1
    });
  } catch (error) {
    console.error('Check appointment limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check appointment limit'
    });
  }
};

/**
 * @desc    Increment appointment count
 * @route   POST /api/appointments/increment-count
 * @access  Private
 */
export const incrementAppointmentCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize appointmentUsage if not exists
    if (!user.appointmentUsage) {
      user.appointmentUsage = {
        totalAppointments: 0,
        activeAppointments: 0,
        lastBookedDate: null
      };
    }

    // Count active appointments (pending + confirmed)
    const activeAppointments = user.appointmentsBooked?.filter(
      apt => ['pending', 'confirmed'].includes(apt.status)
    ).length || 0;

    // Update appointment tracking
    user.appointmentUsage.totalAppointments = (user.appointmentUsage.totalAppointments || 0) + 1;
    user.appointmentUsage.activeAppointments = activeAppointments;
    user.appointmentUsage.lastBookedDate = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Appointment count updated',
      appointmentUsage: user.appointmentUsage
    });
  } catch (error) {
    console.error('Increment appointment count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment count'
    });
  }
};