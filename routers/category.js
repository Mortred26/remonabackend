const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../Middleware/authMiddleware');

// Multer configuration for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// Middleware to serve static files
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Create a new category with an optional image upload
router.post(
  '/',
  authMiddleware,
  upload.single('image'),
  body('name').custom(async (value) => {
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
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).send('Access denied. Admin access required.');
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.body;
      let imagePath = null;

      if (req.file) {
        const relativePath = `uploads/${req.file.originalname}`;
        const fullPath = path.join(__dirname, '../', relativePath);
        if (fs.existsSync(fullPath)) {
          // Use existing image if it already exists
          imagePath = relativePath;
        } else {
          // Save new image
          imagePath = relativePath;
          fs.renameSync(req.file.path, fullPath); // Move file to the correct location
        }
      }

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
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const { name } = req.body;
    let imagePath = null;

    // Find the existing category
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).send('Category not found');
    }

    if (req.file) {
      const relativePath = `uploads/${req.file.originalname}`;
      const fullPath = path.join(__dirname, '../', relativePath);
      if (fs.existsSync(fullPath)) {
        // Use existing image if it already exists
        imagePath = relativePath;
      } else {
        // Save new image
        imagePath = relativePath;
        fs.renameSync(req.file.path, fullPath); // Move file to the correct location

        // Delete the old image if a new one is uploaded
        if (category.image) {
          const oldImagePath = path.join(__dirname, '../', category.image);
          fs.unlink(oldImagePath, (err) => {
            if (err) {
              console.error('Error deleting old image:', err);
            }
          });
        }
      }
    }

    // Update the category with new values
    category.name = name || category.name;
    category.image = imagePath || category.image;
    await category.save();

    res.status(200).json(category);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete a category by ID
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const categoryId = req.params.id;
    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      return res.status(404).send('Category not found');
    }

    if (deletedCategory.image) {
      const oldImagePath = path.join(__dirname, '../', deletedCategory.image);
      fs.unlink(oldImagePath, (err) => {
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
