import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import ChatMessage from '../models/ChatMessage.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';

/**
 * Helper function to check if chat is allowed based on appointment time
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
  
  // If appointment is not confirmed, allow read-only viewing (matches REST behavior)
  if (appointment.status !== 'confirmed') {
    return { allowed: true, canSend: false, reason: `Appointment is ${appointment.status}. Chat is read-only` };
  }
  
  // Determine chat start time (either when doctor granted access or appointment time)
  let chatStartTime = appointment.chatAccessGrantedAt 
    ? new Date(appointment.chatAccessGrantedAt) 
    : appointmentDate;
  
  // Chat end time is 1 hour after chat starts
  const chatEndTime = new Date(chatStartTime);
  chatEndTime.setHours(chatEndTime.getHours() + 1);
  
  // If chat has ended
  if (now > chatEndTime) {
    return { 
      allowed: true, 
      canSend: false, 
      reason: 'Chat session has ended (1 hour limit)'
    };
  }
  
  // Doctor can always send messages in confirmed appointments
  if (userRole === 'doctor') {
    return { allowed: true, canSend: true };
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
        reason: `Chat will be available in ${timeUntil} minutes or when doctor grants access`
      };
    }
    
    return { allowed: true, canSend: true };
  }
  
  return { allowed: false, canSend: false, reason: 'Invalid user role' };
};

/**
 * Initialize Socket.io server
 */
export const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Add socket to a per-user room so we can notify users globally about new messages
    try {
      let actualUserId = socket.userId;
      
      // Check if this is a doctor account - if so, use Doctor._id instead of User account id
      const doctor = await Doctor.findOne({ userId: socket.userId });
      if (doctor) {
        actualUserId = doctor._id.toString();
        console.log(`  👨‍⚕️ Doctor detected. Using Doctor._id for room: ${actualUserId}`);
        socket.doctorId = doctor._id;
      }
      
      socket.join(`user:${actualUserId}`);
      console.log(`Socket ${socket.id} joined personal room: user:${actualUserId}`);
    } catch (err) {
      console.warn('Failed to join user room for socket:', err);
    }

    /**
     * Join appointment chat room
     */
    socket.on('join-appointment', async ({ appointmentId }) => {
      try {
        const userId = socket.userId;
        
        // Find appointment and verify access
        const user = await User.findById(userId);
        let appointment = null;
        let userRole = 'user';
        let senderName = '';
        let senderModel = 'User';
        
        if (user) {
          appointment = user.appointmentsBooked.id(appointmentId);
          senderName = user.userInfo?.name || user.username || 'User';
        }
        
        // If not found, check if user is a doctor
        if (!appointment) {
          const doctor = await Doctor.findOne({ userId });
          if (doctor) {
            appointment = doctor.bookedAppointments.id(appointmentId);
            if (appointment) {
              userRole = 'doctor';
              senderName = `Dr. ${doctor.personalInfo.firstName} ${doctor.personalInfo.lastName}`;
              senderModel = 'Doctor';
            }
          }
        }
        
        if (!appointment) {
          // Fallback: allow read-only join if there are existing messages for this appointment from this user
          const fallbackMsg = await ChatMessage.findOne({ appointmentId, $or: [{ senderId: userId }, { recipientId: userId }] }).lean();
          if (fallbackMsg) {
            console.log('Fallback join allowed based on existing message for user:', userId);
            // Create a minimal appointment object to allow joining the room (read-only)
            appointment = {
              _id: appointmentId,
              date: null,
              time: null,
              status: 'orphaned',
              chatAccessGrantedAt: null,
              doctorId: fallbackMsg.senderRole === 'doctor' ? fallbackMsg.senderId : null,
              userId: fallbackMsg.senderRole === 'user' ? fallbackMsg.senderId : null
            };
            // Keep userRole as detected earlier (doctor if found), otherwise default to 'user'
            if (!userRole) userRole = 'user';
            senderName = senderName || (userRole === 'doctor' ? 'Doctor' : 'User');
          } else {
            socket.emit('error', { message: 'Appointment not found' });
            return;
          }
        }
        
        // Check if chat is allowed
        const accessCheck = isChatAllowed(appointment, userRole);
        
        if (!accessCheck.allowed) {
          socket.emit('chat-closed', { 
            reason: accessCheck.reason,
            appointment: {
              date: appointment.date,
              time: appointment.time,
              status: appointment.status
            }
          });
          return;
        }
        
        // Join room
        socket.join(appointmentId);
        socket.appointmentId = appointmentId;
        socket.userRole = userRole;
        socket.senderName = senderName;
        socket.senderModel = senderModel;
        
        console.log(`👤 ${senderName} (${userRole}, userId: ${userId}) joining room ${appointmentId}`);
        console.log(`  🔐 socket.userId=${socket.userId}, socket.userRole=${socket.userRole}, socket.senderModel=${socket.senderModel}`);
        
        // Verify socket is in the room
        const rooms = Array.from(socket.rooms);
        console.log(`📍 Socket ${socket.id} is now in rooms:`, rooms);
        
        // Get other user's name for display
        let otherUserName = '';
        let otherUserId = '';
        if (userRole === 'doctor') {
          // Doctor is viewing chat - get patient name
          const patient = await User.findById(appointment.userId);
          otherUserName = patient?.userInfo?.name || patient?.username || 'Patient';
          otherUserId = appointment.userId?.toString() || '';
          console.log(`👤 Doctor viewing chat with patient: ${otherUserName} (ID: ${appointment.userId})`);
        } else {
          // User is viewing chat - get doctor name
          const doctorDoc = await Doctor.findById(appointment.doctorId);
          if (doctorDoc) {
            otherUserName = `Dr. ${doctorDoc.personalInfo.firstName} ${doctorDoc.personalInfo.lastName}`;
            otherUserId = appointment.doctorId?.toString() || '';
          } else {
            otherUserName = 'Doctor';
          }
          console.log(`👤 User viewing chat with doctor: ${otherUserName} (ID: ${appointment.doctorId})`);
        }
        
        socket.emit('joined', { 
          appointmentId,
          userRole,
          otherUserName,
          otherUserId,
          canSend: accessCheck.canSend,
          message: accessCheck.reason || 'Successfully joined chat'
        });
        
        console.log(`${senderName} (${userRole}) joined appointment ${appointmentId}, otherUser: ${otherUserName}, canSend: ${accessCheck.canSend}`);
        
      } catch (error) {
        console.error('Error joining appointment:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    /**
     * Send message
     */
    socket.on('send-message', async ({ appointmentId, message }) => {
      try {
        if (!socket.appointmentId || socket.appointmentId !== appointmentId) {
          socket.emit('error', { message: 'Not joined to this appointment' });
          return;
        }
        
        if (!message || message.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }
        
        if (message.length > 1000) {
          socket.emit('error', { message: 'Message too long (max 1000 characters)' });
          return;
        }
        
        // Re-verify chat access before sending
        const userId = socket.userId;
        const user = await User.findById(userId);
        let appointment = null;
        let userRole = socket.userRole;
        
        if (user) {
          appointment = user.appointmentsBooked.id(appointmentId);
        }
        
        if (!appointment) {
          const doctor = await Doctor.findOne({ userId });
          if (doctor) {
            appointment = doctor.bookedAppointments.id(appointmentId);
            userRole = 'doctor';
          }
        }
        
        if (!appointment) {
          socket.emit('error', { message: 'Appointment not found' });
          return;
        }
        
        // Get fresh access check with latest appointment data
        const accessCheck = isChatAllowed(appointment, userRole);
        
        console.log(`Send message access check for ${socket.senderName} (${userRole}):`, {
          allowed: accessCheck.allowed,
          canSend: accessCheck.canSend,
          chatAccessGrantedAt: appointment.chatAccessGrantedAt,
          reason: accessCheck.reason
        });
        
        if (!accessCheck.allowed) {
          socket.emit('chat-closed', { 
            reason: accessCheck.reason,
            appointment: {
              date: appointment.date,
              time: appointment.time,
              status: appointment.status
            }
          });
          
          // Notify other users in the room
          socket.to(appointmentId).emit('chat-closed', {
            reason: 'Appointment time has ended',
            appointment: {
              date: appointment.date,
              time: appointment.time,
              status: appointment.status
            }
          });
          
          return;
        }
        
        // Check if user can send messages
        if (!accessCheck.canSend) {
          socket.emit('error', { 
            message: accessCheck.reason || 'You cannot send messages at this time',
            canSend: false
          });
          return;
        }

        // Determine recipientId (the other person in the chat)
        let recipientId = null;
        try {
          console.log(`🔍 Determining recipientId for ${socket.userRole}. socket.userId=${socket.userId}, appointmentId=${appointmentId}`);
          
          if (socket.userRole === 'doctor') {
            // Recipient is the user/patient -> find in Doctor collection
            console.log(`  → Doctor sending, looking for Doctor with userId=${socket.userId}`);
            const doctor = await Doctor.findOne({ userId: socket.userId });
            if (doctor) {
              console.log(`  ✅ Found doctor, checking appointment ${appointmentId}`);
              const appointment = doctor.bookedAppointments.id(appointmentId);
              recipientId = appointment?.userId || null;
              console.log(`  → recipientId from doctor appointment: ${recipientId}`);
            } else {
              console.log(`  ❌ No doctor found with userId=${socket.userId}`);
            }
          } else {
            // Sender is a user/patient -> recipient is the doctor
            console.log(`  → User sending, looking for User with _id=${socket.userId}`);
            const user = await User.findById(socket.userId);
            if (user) {
              console.log(`  ✅ Found user, checking appointment ${appointmentId}`);
              const appointment = user.appointmentsBooked.id(appointmentId);
              recipientId = appointment?.doctorId || null;
              console.log(`  → recipientId from user appointment: ${recipientId}`);
            } else {
              console.log(`  ❌ No user found with _id=${socket.userId}`);
            }
          }

          // Fallback: try to locate appointment in both collections if still null
          if (!recipientId) {
            console.log(`  🔄 recipientId is null, trying fallback search...`);
            // Try user side
            const user = await User.findOne({ 'appointmentsBooked._id': appointmentId });
            if (user) {
              console.log(`  ✅ Found user in fallback, looking for recipient`);
              const apt = user.appointmentsBooked.id(appointmentId);
              if (apt) {
                if (socket.userRole === 'doctor') {
                  recipientId = apt.userId;
                } else {
                  recipientId = apt.doctorId;
                }
              }
              console.log(`  → recipientId from fallback (user side): ${recipientId}`);
            }
            // Try doctor side
            if (!recipientId) {
              const doctor = await Doctor.findOne({ 'bookedAppointments._id': appointmentId });
              if (doctor) {
                console.log(`  ✅ Found doctor in fallback, looking for recipient`);
                const apt = doctor.bookedAppointments.id(appointmentId);
                if (apt) {
                  if (socket.userRole === 'doctor') {
                    // Doctor sending - recipient is the user
                    recipientId = apt.userId;
                  } else {
                    // User sending - recipient is the doctor (use doctor's _id, not a field)
                    recipientId = doctor._id;
                  }
                }
                console.log(`  → recipientId from fallback (doctor side): ${recipientId}`);
              }
            }
          }
        } catch (error) {
          console.error('Error determining recipientId:', error);
        }
        
        console.log(`📍 [CRITICAL] recipientId determined: ${recipientId} for ${socket.userRole} sender. appointmentId: ${appointmentId}`);
        
        // Save message to database
        const chatMessage = new ChatMessage({
          appointmentId,
          senderRole: socket.userRole,
          senderId: socket.userId,
          senderModel: socket.senderModel,
          senderName: socket.senderName,
          recipientId: recipientId,
          message: message.trim()
        });
        
        await chatMessage.save();
        
        console.log(`💾 Message saved to database:`, {
          id: chatMessage._id,
          appointmentId: chatMessage.appointmentId,
          from: chatMessage.senderName,
          role: chatMessage.senderRole,
          recipientId: chatMessage.recipientId,
          isRead: chatMessage.isRead
        });
        
        // Get all sockets in the room to verify broadcast
        const socketsInRoom = await io.in(appointmentId).fetchSockets();
        console.log(`📡 Broadcasting message to ${socketsInRoom.length} sockets in room ${appointmentId}`);
        
        // Emit to appointment room (including sender)
        io.to(appointmentId).emit('new-message', {
          _id: chatMessage._id,
          appointmentId: chatMessage.appointmentId,
          senderRole: chatMessage.senderRole,
          senderId: chatMessage.senderId,
          senderName: chatMessage.senderName,
          recipientId: chatMessage.recipientId,
          message: chatMessage.message,
          status: chatMessage.status,
          createdAt: chatMessage.createdAt
        });

        // Also notify the recipient at a per-user level so UI elements outside the chat room
        // (like the bottom tab bar) can react to incoming messages in real-time.
        if (chatMessage.recipientId) {
          // Compute unread count for recipient to include in payload and avoid extra fetch on client
          const unreadCount = await ChatMessage.countDocuments({ recipientId: chatMessage.recipientId, isRead: false });

          console.log(`📢 [EMIT TO RECIPIENT] Sending user-new-message to room: user:${chatMessage.recipientId}. unreadCount=${unreadCount}`);
          
          io.to(`user:${chatMessage.recipientId}`).emit('user-new-message', {
            appointmentId: chatMessage.appointmentId,
            messageId: chatMessage._id,
            senderName: chatMessage.senderName,
            senderId: chatMessage.senderId,
            createdAt: chatMessage.createdAt,
            unreadCount
          });
          console.log(`✅ Notified user:${chatMessage.recipientId} about new message. unreadCount=${unreadCount}`);

          // Also notify the sender's personal room so sender's chat list gets updated immediately
          try {
            const senderUnreadCount = await ChatMessage.countDocuments({ recipientId: chatMessage.senderId, isRead: false });
            io.to(`user:${chatMessage.senderId}`).emit('user-new-message', {
              appointmentId: chatMessage.appointmentId,
              messageId: chatMessage._id,
              senderName: chatMessage.senderName,
              senderId: chatMessage.senderId,
              createdAt: chatMessage.createdAt,
              unreadCount: senderUnreadCount,
              isSender: true
            });
            console.log(`✅ Notified sender user:${chatMessage.senderId} about sent message (local update). unreadCount=${senderUnreadCount}`);
          } catch (e) {
            console.warn('Failed to notify sender personal room:', e);
          }
        }

        console.log(`Message broadcasted in appointment ${appointmentId} by ${socket.senderName}`);
        
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing', ({ appointmentId, isTyping }) => {
      if (socket.appointmentId === appointmentId) {
        socket.to(appointmentId).emit('user-typing', {
          userRole: socket.userRole,
          senderName: socket.senderName,
          isTyping
        });
      }
    });

    /**
     * Mark message as delivered
     */
    socket.on('message-delivered', async ({ messageId }) => {
      try {
        const message = await ChatMessage.findById(messageId);
        if (message && message.status === 'sent') {
          message.status = 'delivered';
          message.deliveredAt = new Date();
          await message.save();
          
          // Notify sender that message was delivered
          io.to(socket.appointmentId).emit('message-status-update', {
            messageId,
            status: 'delivered',
            deliveredAt: message.deliveredAt
          });
          
          console.log(`Message ${messageId} marked as delivered`);
        }
      } catch (error) {
        console.error('Error marking message as delivered:', error);
      }
    });

    /**
     * Mark message as read
     */
    socket.on('message-read', async ({ messageId }) => {
      try {
        const message = await ChatMessage.findById(messageId);
        if (message && message.status !== 'read') {
          message.status = 'read';
          message.readAt = new Date();
          message.isRead = true;
          await message.save();
          
          // Notify sender that message was read
          io.to(socket.appointmentId).emit('message-status-update', {
            messageId,
            status: 'read',
            readAt: message.readAt
          });
          
          console.log(`Message ${messageId} marked as read`);
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    /**
     * Mark all messages as read
     */
    socket.on('mark-all-read', async ({ appointmentId }) => {
      try {
        if (socket.appointmentId !== appointmentId) return;
        
        // Find all unread messages sent by the other user
        const result = await ChatMessage.updateMany(
          {
            appointmentId,
            senderId: { $ne: socket.userId },
            status: { $ne: 'read' }
          },
          {
            status: 'read',
            readAt: new Date(),
            isRead: true
          }
        );
        
        // Notify all users in the room
        io.to(appointmentId).emit('messages-read', {
          appointmentId,
          readBy: socket.userRole
        });
        
        console.log(`Marked ${result.modifiedCount} messages as read in appointment ${appointmentId}`);
      } catch (error) {
        console.error('Error marking all messages as read:', error);
      }
    });

    /**
     * Access granted notification
     */
    socket.on('access-granted', async ({ appointmentId }) => {
      try {
        console.log(`Access granted event received for appointment ${appointmentId}`);
        
        // Fetch both user and doctor appointments to get latest data
        const users = await User.find({ 'appointmentsBooked._id': appointmentId });
        const doctors = await Doctor.find({ 'bookedAppointments._id': appointmentId });
        
        let userAppointment = null;
        let doctorAppointment = null;
        
        if (users.length > 0) {
          userAppointment = users[0].appointmentsBooked.id(appointmentId);
        }
        
        if (doctors.length > 0) {
          doctorAppointment = doctors[0].bookedAppointments.id(appointmentId);
        }
        
        // Get all sockets in the room
        const socketsInRoom = await io.in(appointmentId).fetchSockets();
        
        // Send individual access status to each socket based on their role
        for (const clientSocket of socketsInRoom) {
          const clientRole = clientSocket.userRole;
          const appointment = clientRole === 'doctor' ? doctorAppointment : userAppointment;
          
          if (appointment) {
            const accessCheck = isChatAllowed(appointment, clientRole);
            
            clientSocket.emit('access-granted', {
              message: 'Chat access has been granted',
              canSend: accessCheck.canSend,
              chatAccessGrantedAt: appointment.chatAccessGrantedAt
            });
            
            console.log(`Sent access-granted to ${clientSocket.senderName} (${clientRole}), canSend: ${accessCheck.canSend}`);
          }
        }
        
      } catch (error) {
        console.error('Error handling access-granted:', error);
      }
    });

    /**
     * Check current access status (allows users to refresh their access)
     */
    socket.on('check-access', async ({ appointmentId }) => {
      try {
        if (socket.appointmentId !== appointmentId) {
          socket.emit('error', { message: 'Not joined to this appointment' });
          return;
        }
        
        const userId = socket.userId;
        const user = await User.findById(userId);
        let appointment = null;
        
        if (user) {
          appointment = user.appointmentsBooked.id(appointmentId);
        }
        
        if (!appointment) {
          const doctor = await Doctor.findOne({ userId });
          if (doctor) {
            appointment = doctor.bookedAppointments.id(appointmentId);
          }
        }
        
        if (!appointment) {
          socket.emit('error', { message: 'Appointment not found' });
          return;
        }
        
        const accessCheck = isChatAllowed(appointment, socket.userRole);
        
        socket.emit('access-status', {
          canSend: accessCheck.canSend,
          message: accessCheck.reason || '',
          chatAccessGrantedAt: appointment.chatAccessGrantedAt
        });
        
        console.log(`Access check for ${socket.senderName}: canSend=${accessCheck.canSend}`);
        
      } catch (error) {
        console.error('Error checking access:', error);
        socket.emit('error', { message: 'Failed to check access' });
      }
    });

    /**
     * Leave appointment
     */
    /**
     * Video Call: Initiate call
     */
    socket.on('call:initiate', async ({ callerId, receiverId, callerRole, chatSessionId }) => {
      try {
        console.log(`📞 Call initiated by ${callerRole} in session ${chatSessionId}`);
        
        // Verify the socket is in the appointment room
        if (socket.appointmentId !== chatSessionId) {
          socket.emit('call:error', { message: 'Not in the appointment room' });
          return;
        }
        
        // Verify chat access (must have canSend permission to call)
        const userId = socket.userId;
        let appointment = null;
        let userRole = socket.userRole;
        
        const user = await User.findById(userId);
        if (user) {
          appointment = user.appointmentsBooked.id(chatSessionId);
        }
        
        if (!appointment) {
          const doctor = await Doctor.findOne({ userId });
          if (doctor) {
            appointment = doctor.bookedAppointments.id(chatSessionId);
          }
        }
        
        if (!appointment) {
          socket.emit('call:error', { message: 'Appointment not found' });
          return;
        }
        
        const accessCheck = isChatAllowed(appointment, userRole);
        if (!accessCheck.canSend) {
          socket.emit('call:error', { 
            message: 'You need chat access before starting a video call',
            reason: accessCheck.reason
          });
          return;
        }
        
        // Emit incoming call to all other sockets in the room
        socket.to(chatSessionId).emit('call:incoming', {
          callerId: socket.userId,
          callerName: socket.senderName,
          callerRole: socket.userRole,
          chatSessionId,
        });
        
        console.log(`✅ Call notification sent to other users in room ${chatSessionId}`);
        
      } catch (error) {
        console.error('Error initiating call:', error);
        socket.emit('call:error', { message: 'Failed to initiate call' });
      }
    });

    /**
     * Video Call: Accept call
     */
    socket.on('call:accept', async ({ callerId, chatSessionId }) => {
      try {
        console.log(`✅ Call accepted in session ${chatSessionId}`);
        
        // Notify the caller that call was accepted
        socket.to(chatSessionId).emit('call:accepted', {
          receiverId: socket.userId,
          chatSessionId,
        });
        
        console.log(`📞 Call acceptance notification sent to caller`);
        
      } catch (error) {
        console.error('Error accepting call:', error);
        socket.emit('call:error', { message: 'Failed to accept call' });
      }
    });

    /**
     * Video Call: Reject call
     */
    socket.on('call:reject', async ({ callerId, chatSessionId, reason }) => {
      try {
        console.log(`❌ Call rejected in session ${chatSessionId}: ${reason}`);
        
        // Notify the caller that call was rejected
        socket.to(chatSessionId).emit('call:rejected', {
          reason: reason || 'Call declined',
        });
        
        console.log(`📴 Call rejection notification sent to caller`);
        
      } catch (error) {
        console.error('Error rejecting call:', error);
        socket.emit('call:error', { message: 'Failed to reject call' });
      }
    });

    /**
     * Video Call: End call
     */
    socket.on('call:end', async ({ chatSessionId, reason }) => {
      try {
        console.log(`📴 Call ended by userId: ${socket.userId} in session ${chatSessionId}: ${reason}`);
        
        // Get all sockets in the room
        const socketsInRoom = await io.in(chatSessionId).fetchSockets();
        console.log(`📴 Sockets in room ${chatSessionId}: ${socketsInRoom.length}`);
        socketsInRoom.forEach(s => {
          console.log(`  - Socket ${s.id} (userId: ${s.userId})`);
        });
        
        // Notify all users in the room that call ended
        io.to(chatSessionId).emit('call:ended', {
          endedBy: socket.userId,
          reason: reason || 'Call ended',
        });
        
        console.log(`📴 Call end notification (call:ended) sent to room ${chatSessionId}`);
        
      } catch (error) {
        console.error('Error ending call:', error);
        socket.emit('call:error', { message: 'Failed to end call' });
      }
    });

    socket.on('leave-appointment', ({ appointmentId }) => {
      if (socket.appointmentId === appointmentId) {
        socket.leave(appointmentId);
      }
    });

    /**
     * Disconnect
     */
    socket.on('disconnect', () => {
      if (socket.appointmentId) {
        socket.leave(socket.appointmentId);
      }
    });
  });

  // Periodic check for ended appointments (every minute)
  setInterval(async () => {
    try {
      const rooms = io.sockets.adapter.rooms;
      
      for (const [appointmentId, sockets] of rooms) {
        // Skip if it's a socket ID (not a room) or a user notification room
        if (sockets.size === 1 || appointmentId.startsWith('user:')) continue;
        
        // Check if appointment has ended
        const users = await User.find({ 'appointmentsBooked._id': appointmentId });
        const doctors = await Doctor.find({ 'bookedAppointments._id': appointmentId });
        
        let appointment = null;
        
        if (users.length > 0) {
          appointment = users[0].appointmentsBooked.id(appointmentId);
        } else if (doctors.length > 0) {
          appointment = doctors[0].bookedAppointments.id(appointmentId);
        }
        
        if (appointment) {
          const accessCheck = isChatAllowed(appointment, 'user');
          
          if (!accessCheck.allowed) {
            // Notify all users and close chat
            io.to(appointmentId).emit('chat-closed', {
              reason: 'Appointment time has ended',
              appointment: {
                date: appointment.date,
                time: appointment.time,
                status: appointment.status
              }
            });
            
            // Disconnect all sockets from this room
            const socketsInRoom = await io.in(appointmentId).fetchSockets();
            socketsInRoom.forEach(socket => {
              socket.leave(appointmentId);
            });
            
          }
        }
      }
    } catch (error) {
      console.error('Error in periodic check:', error);
    }
  }, 60000); // Check every minute

  return io;
};
