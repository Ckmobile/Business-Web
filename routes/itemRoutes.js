const express = require("express");
const router = express.Router();
const Item = require("../models/Item");

// ADD ITEM
router.post("/add", async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();

    res.status(201).json({
      success: true,
      message: "Item added successfully",
      item,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET ITEMS
router.get("/", async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

module.exports = router;
