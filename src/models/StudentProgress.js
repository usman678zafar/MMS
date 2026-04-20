import mongoose from "mongoose";

const studentProgressSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    type: {
      type: String,
      enum: ["Qaida", "Nazra", "Hifz", "Girdan"],
      required: true,
    },
    para: {
      type: Number,
      min: 1,
      max: 30,
    },
    surah_number: {
      type: Number,
      min: 1,
      max: 114,
    },
    surah: {
      type: String,
      trim: true,
    },
    lesson: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.StudentProgress ||
  mongoose.model("StudentProgress", studentProgressSchema);
