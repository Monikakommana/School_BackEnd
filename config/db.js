import mongoose from "mongoose"

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn("MONGO_URI is missing. Running with CSV-only storage.")
      return
    }

    await mongoose.connect(process.env.MONGO_URI)

    console.log("MongoDB Connected Successfully")
  } catch (error) {
    console.error("MongoDB Connection Error:", error)
    throw error
  }
}

export default connectDB