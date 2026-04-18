import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: [
        "super_admin",
        "admin",
        "accountant",
        "teacher",
        "inventory_manager",
        "viewer",
      ],
      default: "viewer",
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        const userObject = ret;
        // Include password for server-side comparison
        userObject.password = doc.password;
        delete userObject.password;
        return userObject;
      },
    },
  },
);

export default mongoose.models.User || mongoose.model("User", userSchema);
