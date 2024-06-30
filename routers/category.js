const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const auth = require('../Middleware/authMiddleware'); // Import authentication middleware
const authMiddleware = require('../Middleware/authMiddleware');
// Multer configuration for image upload
const upload = multer({
  dest: 'uploads/', // Destination folder for uploaded files
});

// Create a new category with an optional image upload
router.post(
  '/',
  authMiddleware, // Add authentication middleware
  upload.single('image'),
  body('name').custom(async (value, { req }) => {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp('^' + value + '$', 'i') },
    });
    if (existingCategory) {
      throw new Error('This category name already exists');
    }
    return true;
  }),
  async (req, res) => {
    try {
      // Ensure that the user is authenticated and has admin rights
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).send('Access denied. Admin access required.');
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.body;
      const imagePath = req.file ? req.file.path : null;

      const category = new Category({ name, image: imagePath });
      await category.save();

      res.status(201).json(category);
    } catch (error) {
      res.status(400).send(error.message);
    }
  }
);

// Retrieve all categories with their images
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    if (!categories) {
      return res.status(404).send('No categories found');
    }
    res.status(200).send(categories);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Retrieve a category by ID with its image
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).send('Category not found');
    }
    res.status(200).send(category);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a category by ID, with optional image update
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    // Ensure that the user is authenticated and has admin rights
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const { name } = req.body;
    const imagePath = req.file ? req.file.path : null;

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name, image: imagePath },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).send('Category not found');
    }

    // If a new image is uploaded, delete the old image
    if (imagePath && updatedCategory.image) {
      fs.unlink(path.join(__dirname, '..', updatedCategory.image), (err) => {
        if (err) {
          console.error('Error deleting old image:', err);
        }
      });
    }

    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete a category by ID
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Ensure that the user is authenticated and has admin rights
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const categoryId = req.params.id;
    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      return res.status(404).send('Category not found');
    }

    // Delete the associated image if it exists
    if (deletedCategory.image) {
      fs.unlink(path.join(__dirname, '..', deletedCategory.image), (err) => {
        if (err) {
          console.error('Error deleting image:', err);
        }
      });
    }

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
