const router = require("express").Router()
const User = require("../models/User")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

router.post("/login", async (req, res) => {
  const user = await User.findOne({ username: req.body.username })
  if (!user) return res.status(401).json("Invalid")

  const ok = await bcrypt.compare(req.body.password, user.password)
  if (!ok) return res.status(401).json("Invalid")

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
  res.json({ token })
})

module.exports = router
