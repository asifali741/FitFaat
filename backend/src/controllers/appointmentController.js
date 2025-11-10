import mongoose from 'mongoose';
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
    // CREATE APPOINTMENT ENTRY
    // ============================================
    const appointmentData = {
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
    await user.save();

    // Add appointment to doctor's bookedAppointments array
    const doctorAppointmentData = {
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

    res.json({
      success: true,
      appointments: user.appointmentsBooked || []
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
      .select('bookedAppointments')
      .populate('bookedAppointments.userId', 'username email userInfo.name');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      appointments: doctor.bookedAppointments || []
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

    // Validate appointmentId format
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }

    // Find and update appointment in user's record
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
        apt => apt.userId.toString() === userId &&
               new Date(apt.date).toISOString() === new Date(appointment.date).toISOString() &&
               apt.time === appointment.time
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
