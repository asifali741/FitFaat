export type HealthQA = {
  question: string;
  answer: string;
};

export type HealthCategory = {
  id: string;
  questions: HealthQA[];
};

export const healthQAData: Record<string, HealthQA[]> = {
  'workout': [
    {
      question: "What's the best time of day to exercise for maximum benefits?",
      answer: "The best time to exercise depends on your personal schedule and body rhythm. Morning workouts (6-8 AM) boost metabolism and energy for the day, help establish consistency, and may improve sleep quality. Evening workouts (5-7 PM) often show peak performance as body temperature is highest, and can be great for stress relief after work. The key is choosing a time you can stick to consistently."
    },
    {
      question: "How many rest days should I take per week?",
      answer: "For optimal recovery and muscle growth, aim for 1-2 rest days per week if you're doing moderate exercise, and 2-3 rest days if you're doing intense training. Rest days are crucial for muscle repair, preventing burnout, and reducing injury risk. Active recovery like light walking or stretching on rest days can help maintain mobility without overtraining."
    },
    {
      question: "Should I do cardio or strength training first?",
      answer: "The order depends on your primary fitness goal. Do strength training first if building muscle is your priority, as you'll have more energy for lifting heavier weights. Do cardio first if endurance or weight loss is your main goal. For general fitness, alternate the order or do them on separate days. Always warm up for 5-10 minutes regardless of which you choose first."
    }
  ],
  'diet': [
    {
      question: "How much protein do I need daily for a healthy diet?",
      answer: "The recommended daily protein intake is 0.8 grams per kilogram of body weight for sedentary adults. Active individuals need 1.2-1.7g/kg, and athletes or those building muscle may need up to 2g/kg. Good protein sources include lean meats, fish, eggs, legumes, dairy, nuts, and tofu. Spread protein intake throughout the day for optimal absorption."
    },
    {
      question: "Is intermittent fasting safe and effective for weight management?",
      answer: "Intermittent fasting (IF) can be safe and effective for many people when done properly. The 16:8 method (16 hours fasting, 8 hours eating) is most popular and sustainable. IF may help with weight loss, improved insulin sensitivity, and cellular repair. However, it's not suitable for pregnant women, children, or those with certain medical conditions. Always consult a healthcare provider before starting."
    },
    {
      question: "What are the best foods to eat before and after a workout?",
      answer: "Pre-workout (1-3 hours before): Eat easily digestible carbs with some protein like banana with peanut butter, oatmeal with berries, or whole grain toast with eggs. Post-workout (within 30-60 minutes): Focus on protein and carbs for recovery - try chocolate milk, Greek yogurt with fruit, or a protein smoothie with banana. Stay hydrated before, during, and after exercise."
    }
  ],
  'hydration': [
    {
      question: "How can I tell if I'm drinking enough water throughout the day?",
      answer: "Check your urine color - pale yellow indicates good hydration, while dark yellow suggests dehydration. Other signs of proper hydration include: rarely feeling thirsty, having good energy levels, clear skin, and urinating every 3-4 hours. You should aim for at least 8 glasses (64 oz) daily, more if you're active or in hot weather."
    },
    {
      question: "Does coffee and tea count toward daily water intake?",
      answer: "Yes, coffee and tea do contribute to your daily fluid intake, despite containing caffeine. While caffeine has a mild diuretic effect, the fluid in these beverages still provides net hydration. However, water remains the best choice for hydration. Limit caffeine to 400mg daily (about 4 cups of coffee) and balance with plain water throughout the day."
    },
    {
      question: "What are the signs of dehydration I should watch for?",
      answer: "Early signs include thirst, dry mouth, decreased urination, and darker urine. Moderate dehydration causes headaches, dizziness, fatigue, and dry skin. Severe dehydration symptoms include rapid heartbeat, sunken eyes, confusion, and fainting. Prevent dehydration by drinking water regularly, especially during exercise, hot weather, or illness. Seek medical help for severe symptoms."
    }
  ],
  'sleep': [
    {
      question: "How many hours of sleep do adults really need?",
      answer: "Adults aged 18-64 need 7-9 hours of quality sleep per night for optimal health. Individual needs vary based on genetics, activity level, and health status. Consistency is key - going to bed and waking at the same time daily helps regulate your circadian rhythm. Quality matters as much as quantity, so focus on creating a conducive sleep environment."
    },
    {
      question: "What's the best bedtime routine for better sleep quality?",
      answer: "Start winding down 1-2 hours before bed. Dim lights and avoid screens (or use blue light filters). Take a warm bath or shower, practice relaxation techniques like deep breathing or gentle stretching. Keep your bedroom cool (60-67°F), dark, and quiet. Avoid caffeine after 2 PM, large meals 3 hours before bed, and establish a consistent sleep schedule even on weekends."
    },
    {
      question: "How does blue light affect my sleep and what can I do about it?",
      answer: "Blue light from screens suppresses melatonin production, making it harder to fall asleep. It tricks your brain into thinking it's daytime. To minimize impact: use blue light filters or night mode on devices after sunset, wear blue light blocking glasses in the evening, stop screen use 1-2 hours before bed, and use dim, warm lighting in your bedroom. Consider reading a physical book instead of scrolling."
    }
  ],
  'heart': [
    {
      question: "What's a healthy resting heart rate and how do I check it?",
      answer: "A healthy resting heart rate for adults is 60-100 beats per minute (bpm). Athletes may have rates as low as 40-60 bpm. To check: Rest for 5 minutes, find your pulse on your wrist or neck, count beats for 30 seconds and multiply by 2. Lower resting heart rates generally indicate better cardiovascular fitness. Check regularly, ideally in the morning before getting out of bed."
    },
    {
      question: "Which foods are best for maintaining heart health?",
      answer: "Heart-healthy foods include: fatty fish (salmon, mackerel) rich in omega-3s, whole grains for fiber, berries high in antioxidants, nuts and seeds for healthy fats, leafy greens for nitrates and vitamins, and avocados for monounsaturated fats. Limit saturated fats, trans fats, excess sodium, and added sugars. Follow a Mediterranean or DASH diet pattern for optimal heart health."
    },
    {
      question: "How much exercise do I need for a healthy heart?",
      answer: "The American Heart Association recommends at least 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity weekly, plus muscle-strengthening exercises twice a week. This breaks down to 30 minutes of moderate exercise 5 days a week. Activities include brisk walking, swimming, cycling, or dancing. Even small amounts of activity are better than none - start slowly and build up gradually."
    }
  ],
  'symptoms': [
    {
      question: "When should a headache be concerning enough to see a doctor?",
      answer: "Seek immediate medical attention for: sudden, severe 'thunderclap' headaches, headaches with fever, stiff neck, confusion, vision changes, or difficulty speaking, headaches after a head injury, or progressively worsening headaches. Also consult a doctor for new headache patterns after age 50, headaches with weakness or numbness, or if you have more than 15 headache days per month."
    },
    {
      question: "What's the difference between a cold and flu symptoms?",
      answer: "Cold symptoms develop gradually and include runny/stuffy nose, sore throat, mild cough, and rarely fever. Flu symptoms appear suddenly with high fever (102-104°F), severe body aches, extreme fatigue, dry cough, and headache. Flu can lead to serious complications like pneumonia. Both are viral, but flu is more severe. Get a flu shot annually and see a doctor if symptoms worsen or last over 10 days."
    },
    {
      question: "What digestive symptoms warrant medical attention?",
      answer: "See a doctor for: persistent abdominal pain lasting over 24 hours, blood in stool or vomit, unexplained weight loss, chronic diarrhea or constipation (over 2 weeks), severe bloating with pain, difficulty swallowing, or persistent heartburn despite treatment. Emergency symptoms include severe dehydration, high fever with abdominal pain, or signs of intestinal blockage. Don't ignore persistent changes in bowel habits."
    }
  ]
};

// Helper function to get shuffled questions for a category
export const getShuffledQuestions = (category: string): HealthQA[] => {
  const questions = healthQAData[category] || [];
  return [...questions].sort(() => Math.random() - 0.5);
};