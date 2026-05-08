import express from "express"
import cors from "cors"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import fs from "fs/promises"

const __dirname = dirname(fileURLToPath(import.meta.url))
const csvFile = join(__dirname, "applications.csv")
const csvHeader = "id,name,grade,parentName,email,phone,message,submittedAt\n"

const ensureCsvFile = async () => {
  try {
    const handle = await fs.open(csvFile, "a")
    try {
      const stat = await handle.stat()
      if (stat.size === 0) {
        await handle.write(csvHeader)
      }
    } finally {
      await handle.close()
    }
  } catch (error) {
    if (error.code === "EBUSY") {
      return
    }
    if (error.code === "ENOENT") {
      try {
        const handle = await fs.open(csvFile, "w")
        try {
          await handle.write(csvHeader)
        } finally {
          await handle.close()
        }
      } catch (err) {
        if (err.code !== "EBUSY") {
          throw err
        }
      }
      return
    }
    throw error
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const appendCsvRow = async (row) => {
  const maxAttempts = 5
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fs.appendFile(csvFile, row, "utf8")
      return
    } catch (error) {
      if (error.code === "EBUSY" && attempt < maxAttempts) {
        await sleep(100)
        continue
      }
      throw error
    }
  }
}

const escapeCsv = (value) => {
  const text = value == null ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

const parseCsvLine = (line) => {
  const values = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

await ensureCsvFile()

const app = express()
app.use(cors({ origin: "http://localhost:5173" }))
app.use(express.json())

app.post("/api/apply", async (req, res) => {
  const { name, grade, parentName, email, phone, message } = req.body

  if (!name || !grade || !parentName || !email || !phone) {
    return res.status(400).json({ error: "Please fill in all required fields." })
  }

  const application = {
    id: Date.now(),
    name,
    grade,
    parentName,
    email,
    phone,
    message: message || "",
    submittedAt: new Date().toISOString(),
  }

  const row = [
    application.id,
    application.name,
    application.grade,
    application.parentName,
    application.email,
    application.phone,
    application.message,
    application.submittedAt,
  ]
    .map(escapeCsv)
    .join(",") + "\n"

  try {
    await appendCsvRow(row)
    res.json({ success: true, application })
  } catch (error) {
    console.error("CSV write failed:", error)
    res.status(500).json({ error: "Unable to save application. Please try again." })
  }
})

app.get("/api/applications", async (_req, res) => {
  const raw = await fs.readFile(csvFile, "utf8")
  const lines = raw.trim().split(/\r?\n/)
  const headers = lines[0].split(",")
  const applications = lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index] || ""
      return obj
    }, {})
  })

  res.json(applications)
})

const port = 4000
app.listen(port, () => {
  console.log(`Admissions server running at http://localhost:${port}`)
})
