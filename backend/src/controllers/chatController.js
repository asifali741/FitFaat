import ChatMessage from '../models/ChatMessage.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';

/**
 * Helper function to check chat access and sending permissions
 * Returns: { allowed: boolean, canSend: boolean, reason: string, chatStartTime: Date }
 */
const isChatAllowed = (appointment, userRole) => {
  const now = new Date();
  const appointmentDate = new Date(appointment.date);
  
  // Parse time (HH:MM AM/PM format)
  const timeParts = appointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeParts) return { allowed: false, canSend: false, reason: 'Invalid time format' };
  
  let hours = parseInt(timeParts[1]);
  const minutes = parseInt(timeParts[2]);
  const period = timeParts[3].toUpperCase();
  
  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  appointmentDate.setHours(hours, minutes, 0, 0);
  
  // Check status - only confirmed appointments allow chat
  if (appointment.status !== 'confirmed') {
    return { allowed: false, canSend: false, reason: 'Appointment must be confirmed first' };
  }
  
  // Determine chat start time (either when doctor granted access or appointment time)
  let chatStartTime = appointment.chatAccessGrantedAt 
    ? new Date(appointment.chatAccessGrantedAt) 
    : appointmentDate;
  
  // Chat end time is 1 hour after chat starts
  const chatEndTime = new Date(chatStartTime);
  chatEndTime.setHours(chatEndTime.getHours() + 1);
  
  // If chat has ended, mark appointment as completed
  if (now > chatEndTime) {
    return { 
      allowed: true, 
      canSend: false, 
      reason: 'Chat session has ended (1 hour limit)',
      shouldMarkCompleted: true
    };
  }
  
  // Doctor can always send messages after confirmation
  if (userRole === 'doctor') {
    return { allowed: true, canSend: true, chatStartTime };
  }
  
  // User can view chat but can only send if:
  // 1. Doctor granted early access, OR
  // 2. Appointment time has arrived
  if (userRole === 'user') {
    const canUserSend = appointment.chatAccessGrantedAt || now >= appointmentDate;
    
    if (!canUserSend) {
      const timeUntil = Math.ceil((appointmentDate - now) / (1000 * 60));
      return { 
        allowed: true, 
        canSend: false, 
        reason: `Chat will be available in ${timeUntil} minutes or when doctor grants access`,
        chatStartTime
      };
    }
    
    return { allowed: true, canSend: true, chatStartTime };
  }
  
  return { allowed: false, canSend: false, reason: 'Invalid user role' };
};

/**
 * @desc    Get appointment details for chat access verification
 * @route   GET /api/chat/appointment/:appointmentId/access
 * @access  Private
 */
export const checkChatAccess = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;
    
    // Find appointment in user's appointments
    const user = await User.findById(userId);
    let appointment = null;
    let userRole = 'user';
    let doctorId = null;
    let patientId = userId;
    
    if (user) {
      appointment = user.appointmentsBooked.id(appointmentId);
      if (appointment) {
        doctorId = appointment.doctorId;
      }
    }
    
    // If not found, check if user is a doctor
    if (!appointment) {
      const doctor = await Doctor.findOne({ userId });
      if (doctor) {
        appointment = doctor.bookedAppointments.id(appointmentId);
        if (appointment) {
          userRole = 'doctor';
          doctorId = doctor._id;
          patientId = appointment.userId;
        }
      }
    }
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Check if chat is allowed
    const accessCheck = isChatAllowed(appointment, userRole);
    
    // If chat should be marked completed, update appointment status
    if (accessCheck.shouldMarkCompleted && appointment.status !== 'completed') {
      appointment.status = 'completed';
      if (userRole === 'user') {
        await user.save();
      } else {
        const doctor = await Doctor.findOne({ userId: req.user.id });
        await doctor.save();
      }
    }
    
    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        allowed: false,
        message: accessCheck.reason,
        appointment: {
          id: appointmentId,
          date: appointment.date,
          time: appointment.time,
          status: appointment.status
        }
      });
    }
    
    res.json({
      success: true,
      allowed: true,
      canSend: accessCheck.canSend,
      userRole,
      message: accessCheck.reason || 'Chat access granted',
      appointment: {
        id: appointmentId,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        doctorId,
        patientId,
        chatAccessGrantedAt: appointment.chatAccessGrantedAt
      }
    });
    
  } catch (error) {
    console.error('Error checking chat access:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get chat messages for an appointment
 * @route   GET /api/chat/appointment/:appointmentId/messages
 * @access  Private
 */
export const getChatMessages = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;
    
    // Verify user has access to this appointment
    const user = await User.findById(userId);
    const doctor = await Doctor.findOne({ userId });
    
    let hasAccess = false;
    
    if (user) {
      hasAccess = user.appointmentsBooked.some(apt => apt._id.toString() === appointmentId);
    }
    
    if (!hasAccess && doctor) {
      hasAccess = doctor.bookedAppointments.some(apt => apt._id.toString() === appointmentId);
    }
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Get messages
    const messages = await ChatMessage.find({ appointmentId })
      .sort({ createdAt: 1 })
      .limit(500);
    
    res.json({
      success: true,
      messages
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Save a chat message (called by Socket.io)
 * @param   {Object} messageData - Message data
 * @returns {Promise<Object>} Saved message
 */
export const saveChatMessage = async (messageData) => {
  const message = new ChatMessage(messageData);
  await message.save();
  return message;
};

/**
 * @desc    Grant early chat access to user (doctor only)
 * @route   POST /api/chat/appointment/:appointmentId/grant-access
 * @access  Private (Doctor only)
 */
export const grantChatAccess = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;
    
    // Verify user is a doctor
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can grant chat access'
      });
    }
    
    // Find appointment
    const appointment = doctor.bookedAppointments.id(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Check if appointment is confirmed
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Appointment must be confirmed first'
      });
    }
    
    // Grant access
    appointment.chatAccessGrantedAt = new Date();
    await doctor.save();
    
    // Also update in user's appointments
    const patient = await User.findById(appointment.userId);
    if (patient) {
      const userAppointment = patient.appointmentsBooked.id(appointmentId);
      if (userAppointment) {
        userAppointment.chatAccessGrantedAt = new Date();
        await patient.save();
      }
    }
    
    res.json({
      success: true,
      message: 'Chat access granted to user',
      chatAccessGrantedAt: appointment.chatAccessGrantedAt
    });
    
  } catch (error) {
    console.error('Error granting chat access:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Mark messages as read
 * @route   PUT /api/chat/appointment/:appointmentId/read
 * @access  Private
 */
export const markMessagesAsRead = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;
    
    await ChatMessage.updateMany(
      { 
        appointmentId,
        senderId: { $ne: userId },
        isRead: false
      },
      { isRead: true }
    );
    
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
