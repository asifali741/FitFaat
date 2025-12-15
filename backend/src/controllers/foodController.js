import fs from 'fs';
import clarifaiService from '../services/clarifaiService.js';

/**
 * Detect food from image URL
 * POST /api/food-detect
 * Body: { imageUrl: string }
 */
export const detectFoodFromUrl = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl is required in request body',
      });
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format',
      });
    }

    // Call Clarifai service
    const results = await clarifaiService.detectFoodFromUrl(imageUrl);

    res.json(results);
  } catch (error) {
    console.error('Food detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect food in the image',
      error: error.message,
    });
  }
};

/**
 * Detect food from uploaded image file
 * POST /api/food-detect/upload
 * Body: FormData with 'image' file
 */
export const detectFoodFromUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded',
      });
    }

    const imagePath = req.file.path;

    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Delete the uploaded file
    fs.unlinkSync(imagePath);

    // Call Clarifai service
    const results = await clarifaiService.detectFoodFromBase64(base64Image);

    res.json(results);
  } catch (error) {
    // Ensure file is deleted even on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Food detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect food in the image',
      error: error.message,
    });
  }
};
