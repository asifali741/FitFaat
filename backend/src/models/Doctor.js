import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  personalInfo: {
    firstName: {
      type: String,
      required: [true, 'First name is required']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required']
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: 18,
      max: 80
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required']
    },
    profilePicture: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: 500
    }
  },

  professionalInfo: {
    licenseNumber: {
      type: String,
      required: [true, 'Medical license number is required'],
      unique: true
    },
    licenseAuthority: {
      type: String,
      required: [true, 'License authority is required']
    },
    registrationYear: {
      type: Number,
      required: [true, 'Registration year is required']
    },
    yearsOfExperience: {
      type: Number,
      required: [true, 'Years of experience is required'],
      min: 0,
      max: 70
    },
    specialization: {
      type: String,
      enum: [
        'General Practice',
        'Cardiology',
        'Dermatology',
        'Orthopedics',
        'Neurology',
        'Psychiatry',
        'Pediatrics',
        'Gynecology',
        'Surgery',
        'Dentistry',
        'Physiotherapy',
        'Nutrition',
        'Fitness Coaching',
        'Other'
      ],
      required: [true, 'Specialization is required']
    },
    qualifications: {
      type: String,
      required: [true, 'Qualifications are required']
    },
    university: {
      type: String,
      required: [true, 'University is required']
    },
    domain: {
      type: String,
      enum: ['Medical', 'Fitness', 'Nutrition', 'Mental Health', 'Dental', 'Physiotherapy', 'Other'],
      required: [true, 'Domain is required']
    }
  },

  jobInfo: {
    jobType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Freelance'],
      required: [true, 'Job type is required']
    },
    clinicName: {
      type: String,
      default: null
    },
    clinicAddress: {
      type: String,
      default: null
    },
    consultationFee: {
      type: Number,
      min: 0,
      default: 0
    },
    availableDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: []
    },
    availableHours: {
      startTime: String,
      endTime: String
    },
    consultationMode: {
      type: [String],
      enum: ['In-person', 'Online', 'Phone'],
      default: []
    }
  },

  languages: {
    type: [String],
    default: ['English']
  },

  verificationDocuments: {
    licenseDocument: {
      url: String,
      uploadedAt: Date
    },
    degreeDocument: {
      url: String,
      uploadedAt: Date
    },
    registrationDocument: {
      url: String,
      uploadedAt: Date
    }
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },

  adminNotes: {
    type: String,
    default: null
  },

  rating: {
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  submittedAt: {
    type: Date,
    default: null
  },

  approvedAt: {
    type: Date,
    default: null
  }
});

// Update the updatedAt timestamp before saving
doctorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
