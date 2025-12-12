# Google Vision API Meal Detection Feature

## Overview
This feature integrates Google Cloud Vision API to automatically detect dishes from images and populate meal tracking data.

## Backend Implementation

### Files Created
1. **`/backend/src/controllers/visionController.js`**
   - Initializes Google Vision API client using `googleVisonKey.json`
   - Implements `detectDish` controller function
   - Performs label detection on uploaded images
   - Prioritizes food-related keywords
   - Returns detected dish name with confidence scores

2. **`/backend/src/routes/vision.js`**
   - Configures multer for image uploads (10MB limit)
   - Sets up POST route: `/api/vision/detect-dish`
   - Handles single image upload with validation

3. **`/backend/src/index.js`** (Modified)
   - Added vision routes to Express app
   - Route: `app.use('/api/vision', visionRoutes)`

### API Endpoint
**POST** `/api/vision/detect-dish`

**Request:**
- Content-Type: `multipart/form-data`
- Body: `image` (file)

**Response:**
```json
{
  "success": true,
  "dish": "Chicken Biryani",
  "confidence": 0.95,
  "allLabels": [
    { "name": "Chicken Biryani", "confidence": 0.95 },
    { "name": "Rice dish", "confidence": 0.89 },
    { "name": "Food", "confidence": 0.87 }
  ]
}
```

### Food Keywords Prioritization
The system prioritizes labels containing these keywords:
- Pakistani dishes: biryani, curry, karahi, kebab, tikka, korma, pulao, haleem, nihari
- Common foods: chicken, rice, meat, vegetable, bread, naan, roti
- Meal types: breakfast, lunch, dinner
- Categories: food, dish, meal, cuisine, sweet, dessert, drink

## Frontend Implementation

### Modified Files
1. **`/app/(main)/(dashboard)/DetailsDay.tsx`**

### New Features Added

#### 1. Import Addition
```typescript
import Constants from 'expo-constants';
```

#### 2. New State Variables
```typescript
const [isDetectingDish, setIsDetectingDish] = useState(false);
const [detectedDishName, setDetectedDishName] = useState<string>('');
```

#### 3. Image Detection Function
**`detectDishFromImage()`**
- Requests camera roll permissions
- Launches image picker with quality optimization (0.8)
- Uploads image to backend using FormData
- Processes API response
- Auto-searches Pakistani dishes dataset
- Auto-fills meal data if match found
- Shows user-friendly alerts

#### 4. UI Component - Image Upload Button
Located in the meal tracking mode section:

```tsx
<TouchableOpacity
  style={styles.imageUploadButton}
  onPress={detectDishFromImage}
  disabled={isDetectingDish}
>
  <View style={styles.imageUploadIconContainer}>
    <Ionicons name={isDetectingDish ? "hourglass-outline" : "camera-outline"} />
  </View>
  <View style={styles.imageUploadTextContainer}>
    <Text style={styles.imageUploadTitle}>
      {isDetectingDish ? 'Detecting Dish...' : '📸 Upload Image For Dish'}
    </Text>
    <Text style={styles.imageUploadSubtitle}>
      {isDetectingDish ? 'Processing with AI...' : 'Auto-detect food & calories'}
    </Text>
  </View>
  <Ionicons name="chevron-forward" />
</TouchableOpacity>
```

#### 5. New Styles Added
```typescript
imageUploadButton: {
  backgroundColor: colors.primary,
  borderRadius: wp(3),
  padding: wp(4),
  shadowColor: colors.primary,
  shadowOpacity: 0.3,
  elevation: 5,
}
imageUploadIconContainer: { ... }
imageUploadTextContainer: { ... }
imageUploadTitle: { ... }
imageUploadSubtitle: { ... }
```

## User Flow

1. **Upload Image**
   - User taps "📸 Upload Image For Dish" button
   - Permission requested (if first time)
   - Image picker opens

2. **Image Selection**
   - User selects/crops image (4:3 aspect ratio)
   - Image compressed to 80% quality

3. **AI Detection**
   - Button shows "Detecting Dish..." with loading icon
   - Image uploaded to backend
   - Google Vision API processes image
   - Food labels extracted and ranked

4. **Auto-Fill**
   - Detected dish name auto-fills search field
   - Dataset searched for matches
   - If exact match found:
     - Food item auto-selected
     - Calories auto-calculated
     - Success alert shown
   - If partial matches:
     - Search results displayed
     - User selects from list

5. **Complete Tracking**
   - User adjusts quantity if needed
   - Adds meal normally

## Error Handling

### Backend Errors
- No image uploaded: 400 Bad Request
- No labels detected: 404 Not Found
- Vision API error: 500 Internal Server Error
- Uploaded file always deleted (even on error)

### Frontend Errors
- Permission denied: Alert shown
- Network error: "Failed to process the image"
- No detection: Manual entry suggested
- All errors logged to console

## Testing

### Backend Test
```bash
cd /Users/mc/Desktop/FitFaat/backend
npm start

# Test with curl:
curl -X POST http://localhost:5001/api/vision/detect-dish \
  -F "image=@/path/to/food-image.jpg"
```

### Frontend Test
1. Run Expo app: `npx expo start`
2. Navigate to Dashboard → Day Details
3. Tap "Track Meal" mode
4. Tap "📸 Upload Image For Dish"
5. Select food image
6. Verify auto-fill behavior

## Dependencies

### Backend
- `@google-cloud/vision`: ^4.x
- `multer`: ^1.4.5-lts.1 (already installed)

### Frontend
- `expo-image-picker`: SDK 54 compatible (installed)
- `expo-constants`: (already in project)

## Configuration

### Google Cloud Setup
- Project: `foodrecognition-481019`
- Service Account: `fitfaat@foodrecognition-481019.iam.gserviceaccount.com`
- Key File: `/backend/googleVisonKey.json`

### Environment Variables
```env
EXPO_PUBLIC_BACKEND_API_URL=http://10.0.2.2:5001/api
```

## Performance Optimizations

1. **Image Compression**: 80% quality reduces upload size
2. **File Cleanup**: Immediate deletion after processing
3. **Label Limiting**: Only top 5 labels returned
4. **Search Limiting**: Maximum 15 search results
5. **Smart Matching**: Prioritizes food-related labels

## Future Enhancements

1. **Camera Integration**: Add "Take Photo" option
2. **Multiple Images**: Batch upload support
3. **Portion Detection**: Estimate serving size from image
4. **Custom Training**: Train model on Pakistani dishes
5. **Offline Mode**: Cache common detections
6. **History**: Show previously detected dishes

## Troubleshooting

### "No labels detected"
- Image quality too low
- Not a food image
- Try different angle/lighting

### "Permission Required"
- Go to Settings → FitFaat → Photos
- Enable "Read and Write"

### Backend Connection Error
- Check backend is running on port 5001
- Verify EXPO_PUBLIC_BACKEND_API_URL
- Check network connectivity

### No Match Found
- Detected dish not in dataset
- User can manually search
- Or enter details manually

## Code Locations

**Backend:**
- Controller: `/backend/src/controllers/visionController.js`
- Route: `/backend/src/routes/vision.js`
- Main: `/backend/src/index.js` (line with visionRoutes)

**Frontend:**
- Screen: `/app/(main)/(dashboard)/DetailsDay.tsx`
- Function: `detectDishFromImage()` (line ~205)
- UI: Image upload button in meal mode (line ~645)
- Styles: `imageUploadButton` and related (line ~2408)

## Security Considerations

1. **File Size Limit**: 10MB maximum
2. **File Type Validation**: Images only
3. **Temporary Storage**: Files deleted immediately
4. **API Key Security**: Service account key in backend only
5. **Permission Checks**: Explicit user permission required
