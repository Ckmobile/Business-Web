require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const path = require("path")

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static("public"))

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err))

app.use("/api/auth", require("./routes/auth"))
app.use("/api/items", require("./routes/items"))

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"))
})

app.listen(process.env.PORT || 3000, () =>
  console.log("Server Running")
)