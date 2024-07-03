const express = require('express');
const router = express.Router();
const authMiddleware = require('../Middleware/authMiddleware');
const { Brand } = require('../models/brand');

// Route for creating a new brand with authentication
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Ensure that the user is authenticated and has admin rights
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const { name, description } = req.body;

    const brand = new Brand({ name, description });
    await brand.save();

    res.status(201).json(brand);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to retrieve all brands
router.get('/', async (req, res) => {
  try {
    const brands = await Brand.find();
    res.status(200).json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to retrieve a brand by ID
router.get('/:id', async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).send('Brand not found');
    }
    res.status(200).json(brand);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to update a brand by ID with authentication
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Ensure that the user is authenticated and has admin rights
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const { name, description } = req.body;

    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).send('Brand not found');
    }

    brand.name = name;
    brand.description = description;

    await brand.save();

    res.status(200).json(brand);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to delete a brand by ID with authentication
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Ensure that the user is authenticated and has admin rights
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).send('Brand not found');
    }

    await Brand.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
