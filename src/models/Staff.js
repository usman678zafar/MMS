import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    trim: true,
    default: 'Imam'
  },
  monthly_salary: {
    type: Number,
    required: true,
    min: 0
  },
  phone: {
    type: String,
    trim: true
  },
  joining_date: {
    type: Date,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export default mongoose.models.Staff || mongoose.model('Staff', staffSchema);
