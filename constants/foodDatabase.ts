// Food database with calorie information per standard portion
export const foodDatabase = {
  // Proteins
  proteins: [
    { name: 'Chicken Breast (100g)', calories: 165, category: 'Lean Protein' },
    { name: 'Salmon (100g)', calories: 208, category: 'Fatty Protein' },
    { name: 'Eggs (1 large)', calories: 70, category: 'Protein' },
    { name: 'Beef Steak (100g)', calories: 180, category: 'Lean Protein' },
    { name: 'Tofu (100g)', calories: 76, category: 'Plant Protein' },
    { name: 'Turkey Breast (100g)', calories: 135, category: 'Lean Protein' },
    { name: 'Tuna (100g)', calories: 132, category: 'Lean Protein' },
    { name: 'Lentils (100g cooked)', calories: 116, category: 'Plant Protein' },
  ],
  
  // Carbs
  carbs: [
    { name: 'Brown Rice (1 cup cooked)', calories: 215, category: 'Grains' },
    { name: 'Whole Wheat Bread (1 slice)', calories: 80, category: 'Grains' },
    { name: 'Potato (medium, 150g)', calories: 103, category: 'Vegetables' },
    { name: 'Oats (1/2 cup dry)', calories: 150, category: 'Grains' },
    { name: 'Pasta (1 cup cooked)', calories: 221, category: 'Grains' },
    { name: 'Sweet Potato (medium)', calories: 103, category: 'Vegetables' },
    { name: 'Banana (medium)', calories: 105, category: 'Fruits' },
    { name: 'Apple (medium)', calories: 95, category: 'Fruits' },
    { name: 'Quinoa (1 cup cooked)', calories: 222, category: 'Grains' },
  ],
  
  // Fats
  fats: [
    { name: 'Olive Oil (1 tbsp)', calories: 120, category: 'Oils' },
    { name: 'Almonds (23 nuts, 28g)', calories: 164, category: 'Nuts' },
    { name: 'Avocado (1/2)', calories: 120, category: 'Healthy Fats' },
    { name: 'Peanut Butter (1 tbsp)', calories: 96, category: 'Nuts' },
    { name: 'Cheddar Cheese (30g)', calories: 120, category: 'Dairy' },
  ],
  
  // Vegetables
  vegetables: [
    { name: 'Broccoli (1 cup raw)', calories: 34, category: 'Vegetables' },
    { name: 'Spinach (1 cup raw)', calories: 7, category: 'Vegetables' },
    { name: 'Carrot (1 medium)', calories: 25, category: 'Vegetables' },
    { name: 'Bell Pepper (1 medium)', calories: 37, category: 'Vegetables' },
    { name: 'Tomato (1 medium)', calories: 22, category: 'Vegetables' },
  ],
  
  // Popular Meals
  meals: [
    { name: 'Grilled Chicken with Rice', calories: 450, category: 'Main Course' },
    { name: 'Salmon with Vegetables', calories: 500, category: 'Main Course' },
    { name: 'Pasta Carbonara (1 plate)', calories: 600, category: 'Main Course' },
    { name: 'Buddha Bowl (Mixed)', calories: 550, category: 'Main Course' },
    { name: 'Margherita Pizza (1 slice)', calories: 285, category: 'Main Course' },
    { name: 'Sandwich (Chicken)', calories: 320, category: 'Main Course' },
    { name: 'Vegetable Stir Fry with Rice', calories: 400, category: 'Main Course' },
  ],
  
  // Snacks
  snacks: [
    { name: 'Protein Bar', calories: 200, category: 'Snack' },
    { name: 'Yogurt (150g)', calories: 100, category: 'Snack' },
    { name: 'Apple with Almond Butter', calories: 230, category: 'Snack' },
    { name: 'Mixed Nuts (30g)', calories: 170, category: 'Snack' },
    { name: 'Granola Bar', calories: 150, category: 'Snack' },
    { name: 'Greek Yogurt (200g)', calories: 130, category: 'Snack' },
  ],
  
  // Beverages
  beverages: [
    { name: 'Protein Shake', calories: 150, category: 'Beverage' },
    { name: 'Orange Juice (8oz)', calories: 110, category: 'Beverage' },
    { name: 'Milk (240ml)', calories: 150, category: 'Beverage' },
    { name: 'Coffee (black)', calories: 0, category: 'Beverage' },
  ],
};

// Food suggestions based on fitness goal
export const goalBasedSuggestions = {
  1: { // Weight Loss (Deficit)
    name: 'Weight Loss',
    foods: [
      { name: 'Grilled Chicken Breast', calories: 165, reason: 'High protein, low calorie' },
      { name: 'Salmon', calories: 208, reason: 'Lean protein with omega-3' },
      { name: 'Spinach Salad', calories: 50, reason: 'Very low calorie, nutritious' },
      { name: 'Grilled Turkey Breast', calories: 135, reason: 'Lean protein source' },
      { name: 'Broccoli with Chicken', calories: 199, reason: 'High protein, low calorie' },
      { name: 'Tuna Salad', calories: 180, reason: 'Lean protein, healthy option' },
    ]
  },
  2: { // Muscle Gain (Surplus)
    name: 'Muscle Gain',
    foods: [
      { name: 'Chicken Breast with Rice', calories: 465, reason: 'Protein + carbs for muscle' },
      { name: 'Salmon with Sweet Potato', calories: 410, reason: 'Protein + carbs + healthy fats' },
      { name: 'Beef Steak with Pasta', calories: 580, reason: 'High protein and calories' },
      { name: 'Protein Shake with Banana', calories: 255, reason: 'Quick protein + carbs' },
      { name: 'Chicken with Quinoa', calories: 487, reason: 'Complete protein meal' },
      { name: 'Eggs with Toast', calories: 270, reason: 'Protein-rich breakfast' },
    ]
  },
  3: { // Maintenance
    name: 'Maintenance',
    foods: [
      { name: 'Grilled Chicken with Brown Rice', calories: 380, reason: 'Balanced meal' },
      { name: 'Salmon with Vegetables', calories: 350, reason: 'Balanced and nutritious' },
      { name: 'Turkey Sandwich', calories: 320, reason: 'Easy balanced option' },
      { name: 'Pasta with Vegetables', calories: 400, reason: 'Balanced carbs and veggies' },
      { name: 'Buddha Bowl', calories: 550, reason: 'Complete balanced meal' },
      { name: 'Grilled Fish with Salad', calories: 300, reason: 'Light and balanced' },
    ]
  }
};

// Water intake database for hydration tracking
export const waterIntakeDatabase = {
  options: [
    { name: 'Glass of Water (250ml)', amount: 0.25, unit: 'liters' },
    { name: 'Bottle of Water (500ml)', amount: 0.5, unit: 'liters' },
    { name: 'Large Bottle (1L)', amount: 1.0, unit: 'liters' },
    { name: 'Cup of Water (200ml)', amount: 0.2, unit: 'liters' },
    { name: 'Sip (50ml)', amount: 0.05, unit: 'liters' },
  ]
};

// Get all foods flattened for search
export const getAllFoods = () => {
  const all = [
    ...foodDatabase.proteins,
    ...foodDatabase.carbs,
    ...foodDatabase.fats,
    ...foodDatabase.vegetables,
    ...foodDatabase.meals,
    ...foodDatabase.snacks,
    ...foodDatabase.beverages,
  ];
  return all;
};

// Search foods by name
export const searchFoods = (query: string) => {
  if (!query.trim()) return [];
  const allFoods = getAllFoods();
  return allFoods.filter(food => 
    food.name.toLowerCase().includes(query.toLowerCase())
  );
};
