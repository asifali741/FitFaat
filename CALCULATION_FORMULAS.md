# Calorie & Hydration Calculation Formulas

## 📊 Calorie Calculation

### 1. BMR (Basal Metabolic Rate) - Mifflin-St Jeor Equation
```
For Men:   BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
For Women: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
```

### 2. TDEE (Total Daily Energy Expenditure)
```
TDEE = BMR × Activity Factor
```

**Activity Factors:**
- Sedentary (little/no exercise): 1.2
- Light (exercise 1-3 days/week): 1.375
- Moderate (exercise 3-5 days/week): 1.55
- Active (exercise 6-7 days/week): 1.725
- Very Active (very heavy exercise/physical job): 1.9

### 3. Goal Calories (based on fitness goal)
```
Weight Loss:  TDEE - 500 calories (0.5kg loss/week)
Muscle Gain:  TDEE + 300 calories (lean muscle gain)
Weight Gain:  TDEE + 500 calories (0.5kg gain/week)
Maintenance:  TDEE (no change)
```

## 💧 Hydration Calculation

### Formula: Body Weight Based
```
Base: 30-35ml per kg of body weight
```

**Adjustments by Activity Level:**
- Sedentary: 30ml per kg
- Light/Moderate: 33ml per kg (default)
- Active/Very Active: 40ml per kg

**Limits:**
- Minimum: 1500ml (1.5L)
- Maximum: 4000ml (4L)

### Examples:

**Example 1: Sedentary person, 70kg**
```
70kg × 30ml = 2100ml (2.1L per day)
```

**Example 2: Moderately active person, 80kg**
```
80kg × 33ml = 2640ml → Rounded to 2600ml (2.6L per day)
```

**Example 3: Very active person, 90kg**
```
90kg × 40ml = 3600ml (3.6L per day)
```

## 🎯 Complete Calculation Example

**User Profile:**
- Gender: Male
- Age: 25 years
- Height: 175 cm
- Weight: 75 kg
- Activity Level: Moderate
- Fitness Goal: Weight Loss

**Step 1: Calculate BMR**
```
BMR = (10 × 75) + (6.25 × 175) - (5 × 25) + 5
BMR = 750 + 1093.75 - 125 + 5
BMR = 1723.75 calories
```

**Step 2: Calculate TDEE**
```
TDEE = 1723.75 × 1.55 (moderate activity)
TDEE = 2671.81 calories
```

**Step 3: Adjust for Goal (Weight Loss)**
```
Goal Calories = 2671.81 - 500
Goal Calories = 2172 calories per day
```

**Step 4: Calculate Hydration**
```
Hydration = 75kg × 33ml (moderate activity)
Hydration = 2475ml → Rounded to 2500ml (2.5L per day)
```

## ✅ Result Validation

The system ensures:
- Calories are never below 1200 (minimum for health)
- Hydration is between 1500ml - 4000ml
- All values are rounded for user-friendly display
- BMI is calculated: weight / (height_m)²

---
*These formulas are based on scientifically validated equations used in nutrition and fitness industries.*
