import vision from '@google-cloud/vision';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Google Vision client
const client = new vision.ImageAnnotatorClient({
    keyFilename: path.join(__dirname, '../../googleVisonKey.json')
});

// Food-related keywords to prioritize
const FOOD_KEYWORDS = [
    'food', 'dish', 'meal', 'cuisine', 'recipe', 'chicken', 'rice', 'biryani',
    'curry', 'meat', 'vegetable', 'bread', 'naan', 'roti', 'karahi', 'kebab',
    'tikka', 'korma', 'pulao', 'haleem', 'nihari', 'samosa', 'pakora', 'chaat',
    'sweet', 'dessert', 'drink', 'beverage', 'breakfast', 'lunch', 'dinner'
];

export const detectDish = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No image file uploaded' 
            });
        }

        const imagePath = req.file.path;

        // Perform label detection on the image
        const [result] = await client.labelDetection(imagePath);
        const labels = result.labelAnnotations;

        // Delete the uploaded file
        fs.unlinkSync(imagePath);

        if (!labels || labels.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No labels detected in the image' 
            });
        }

        // Find the most relevant food-related label
        let detectedDish = null;
        let maxScore = 0;

        for (const label of labels) {
            const description = label.description.toLowerCase();
            const score = label.score;

            // Check if label contains food-related keywords
            const isFoodRelated = FOOD_KEYWORDS.some(keyword => 
                description.includes(keyword)
            );

            if (isFoodRelated && score > maxScore) {
                maxScore = score;
                detectedDish = label.description;
            }
        }

        // If no food-related label found, use the highest confidence label
        if (!detectedDish && labels.length > 0) {
            detectedDish = labels[0].description;
        }

        // Return the detected dish
        res.json({ 
            success: true, 
            dish: detectedDish,
            confidence: maxScore,
            allLabels: labels.slice(0, 5).map(l => ({
                name: l.description,
                confidence: l.score
            }))
        });

    } catch (error) {
        // Ensure file is deleted even on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        console.error('Vision API Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing image',
            error: error.message 
        });
    }
};
