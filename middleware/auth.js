const jwt = require("jsonwebtoken")

module.exports = (req, res, next) => {
  const token = req.headers.authorization
  if (!token) return res.sendStatus(401)

  try {
    jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.sendStatus(403)
  }
}
