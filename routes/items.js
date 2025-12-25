const router = require("express").Router()
const Item = require("../models/Item")
const auth = require("../middleware/auth")

router.get("/", async (req, res) => {
  const q = req.query.search
  const items = q
    ? await Item.find({ name: new RegExp(q, "i") })
    : await Item.find()
  res.json(items)
})

router.post("/", auth, async (req, res) => {
  const item = new Item(req.body)
  await item.save()
  res.json(item)
})

router.delete("/:id", auth, async (req, res) => {
  await Item.findByIdAndDelete(req.params.id)
  res.json("Deleted")
})

module.exports = router
