import mongoose from "mongoose"

const applicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    grade: {
      type: String,
      required: true,
    },

    parentName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    message: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

const Application = mongoose.model(
  "Application",
  applicationSchema
)

export default Application