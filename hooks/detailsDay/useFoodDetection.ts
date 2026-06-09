import { useCallback, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { pakistaniDishes } from "@/app/Dataset/dataSet";
import {
  filterFoodsByDietPreference,
  type DietPreference,
} from "@/constants/foodDatabase";
import { fetchWithTimeout } from "@/utils/apiHelper";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { getBackendBaseUrl, getConfigValue } from "@/utils/config";

import {
  getDetectionTokens,
  getFoodTitle,
  normalizeFoodSearchText,
  toMealNumber,
} from "./detailsDayNutritionUtils";

const FOOD_DETECTION_TIMEOUT_MS = 7000;
const FOOD_DETECTION_FALLBACK_TIMEOUT_MS = 7000;
const FOOD_IMAGE_PICKER_QUALITY = 0.45;
const FOOD_DETECTION_FALLBACK_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const collectDetectionTerms = (payload: any): string[] => {
  const terms: string[] = [];
  const addTerm = (value: any) => {
    if (typeof value === "string" && normalizeFoodSearchText(value).length > 1) {
      terms.push(value);
    }
  };
  const visitPrediction = (prediction: any) => {
    if (!prediction || typeof prediction !== "object") return;
    addTerm(prediction.foodName);
    addTerm(prediction.food_name);
    addTerm(prediction.detectedFood);
    addTerm(prediction.detected_food);
    addTerm(prediction.label);
    addTerm(prediction.name);
    addTerm(prediction.class);
    addTerm(prediction.tag);
    addTerm(prediction.prediction);
  };

  visitPrediction(payload);

  ["labels", "foods", "foodItems", "predictions", "concepts", "results", "tags"].forEach((key) => {
    const value = payload?.[key];
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === "string") {
          addTerm(item);
        } else {
          visitPrediction(item);
        }
      });
    }
  });

  if (Array.isArray(payload?.outputs)) {
    payload.outputs.forEach((output: any) => {
      output?.data?.concepts?.forEach(visitPrediction);
    });
  }

  return Array.from(new Set(terms.map(normalizeFoodSearchText))).filter(Boolean);
};

const detectFoodWithOpenRouterFallback = async (imageBase64?: string | null) => {
  const apiKey = getConfigValue("OPENROUTER_API_KEY");
  if (!apiKey || !imageBase64) return null;

  const response = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fitfaat.com",
        "X-Title": "FitFaat",
      },
      body: JSON.stringify({
        model: FOOD_DETECTION_FALLBACK_MODEL,
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 80,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Identify the main food in this image. Return only JSON: {"foodName":"specific dish name or Unknown","confidence":0.0-1.0}.',
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    },
    FOOD_DETECTION_FALLBACK_TIMEOUT_MS
  );

  const responseText = await response.text();
  let data: any = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  let parsedContent: any = {};
  try {
    parsedContent = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    parsedContent = { foodName: String(content).replace(/```json|```/g, "").trim() };
  }

  const foodName = String(parsedContent.foodName || "").trim();
  if (!foodName || foodName.toLowerCase() === "unknown") return null;

  return {
    success: true,
    foodName,
    confidence: parsedContent.confidence ?? 0.7,
    model: FOOD_DETECTION_FALLBACK_MODEL,
    source: "openrouter-fallback",
  };
};

const findBestPakistaniDishMatch = (terms: string[], preference: DietPreference) => {
  const filteredDishes = filterFoodsByDietPreference(pakistaniDishes, preference) as any[];
  const allTokens = new Set(terms.flatMap(getDetectionTokens));
  const hasChicken = allTokens.has("chicken") || allTokens.has("murgh");
  const hasRice = allTokens.has("rice") || allTokens.has("biryani") || allTokens.has("pulao");

  const fallbackNames = hasChicken && hasRice
    ? ["Chicken Biryani", "Chicken Pulao", "Chicken Pulao (Plain)", "Chicken Fried Rice"]
    : hasRice
      ? ["Boiled White Rice", "Chicken Biryani", "Chicken Pulao"]
      : hasChicken
        ? ["Chicken Tikka Boti (Grilled)", "Chicken Karahi", "Chicken Biryani"]
        : [];

  let bestMatch: any = null;
  let bestScore = 0;

  filteredDishes.forEach((dish) => {
    const title = normalizeFoodSearchText(getFoodTitle(dish));
    const category = normalizeFoodSearchText(dish?.category);
    const titleTokens = new Set(getDetectionTokens(title));
    let score = 0;

    terms.forEach((term) => {
      const normalizedTerm = normalizeFoodSearchText(term);
      if (!normalizedTerm) return;

      if (title === normalizedTerm) score += 180;
      if (title.includes(normalizedTerm)) score += 120;
      if (normalizedTerm.includes(title)) score += 100;

      getDetectionTokens(normalizedTerm).forEach((token) => {
        if (titleTokens.has(token)) score += 24;
        if (category.includes(token)) score += 8;
      });
    });

    if (hasChicken && hasRice && title.includes("chicken")) {
      if (title.includes("biryani")) score += 90;
      if (title.includes("pulao")) score += 75;
      if (title.includes("fried rice")) score += 65;
      if (category.includes("rice")) score += 45;
    }

    if (hasChicken && title.includes("chicken")) score += 24;
    if (hasRice && (title.includes("rice") || category.includes("rice"))) score += 24;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = dish;
    }
  });

  if (bestMatch && bestScore >= 32) return bestMatch;

  return fallbackNames
    .map((name) => filteredDishes.find((dish) => normalizeFoodSearchText(getFoodTitle(dish)) === normalizeFoodSearchText(name)))
    .find(Boolean) || null;
};

type UseFoodDetectionParams = {
  dietPreference: DietPreference;
  mealQuantity: string;
  setFoodSearch: (value: string) => void;
  setSelectedFoodItem: (value: any) => void;
  setCalorieInput: (value: string) => void;
  setShowFoodSearch: (value: boolean) => void;
};

export function useFoodDetection({
  dietPreference,
  mealQuantity,
  setFoodSearch,
  setSelectedFoodItem,
  setCalorieInput,
  setShowFoodSearch,
}: UseFoodDetectionParams) {
  const [isDetectingDish, setIsDetectingDish] = useState(false);
  const [detectedDishName, setDetectedDishName] = useState("");

  const detectDishFromImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photos to use this feature.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: FOOD_IMAGE_PICKER_QUALITY,
        base64: true,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsDetectingDish(true);
      const asset = result.assets[0];
      const imageUri = asset.uri;
      const formData = new FormData();
      const originalFilename = asset.fileName || imageUri.split("/").pop() || "";
      const detectedMimeType = asset.mimeType?.startsWith("image/")
        ? asset.mimeType
        : "image/jpeg";
      const type = detectedMimeType === "image/jpg" ? "image/jpeg" : detectedMimeType;
      const fallbackExtension = type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1] || "jpg";
      const filename = /\.[a-z0-9]+$/i.test(originalFilename)
        ? originalFilename
        : `dish-${Date.now()}.${fallbackExtension}`;

      formData.append("image", {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const base = getBackendBaseUrl();
      const apiUrl = base.replace(/\/api\/?$/, "") + "/api/food-detect/upload?mode=fast";
      const token = await tokenStorage.getToken();
      const headers: Record<string, string> = {
        Accept: "application/json",
        "X-FitFaat-Detection-Mode": "fast",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let data: any = {};
      let backendFailureMessage = "";

      try {
        const response = await fetchWithTimeout(
          apiUrl,
          {
            method: "POST",
            body: formData,
            headers,
          },
          FOOD_DETECTION_TIMEOUT_MS
        );

        const responseText = await response.text();
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          data = { message: responseText };
        }

        if (!response.ok || !data.success) {
          backendFailureMessage = data.message || `Food detection request failed (${response.status})`;
        }
      } catch (backendError) {
        backendFailureMessage = backendError instanceof Error
          ? backendError.message
          : "Backend food detection failed";
      }

      if (!data.success) {
        const fallbackData = await detectFoodWithOpenRouterFallback(asset.base64);
        if (fallbackData?.success) {
          data = fallbackData;
        } else {
          throw new Error(
            /abort|timeout/i.test(backendFailureMessage)
              ? "Food scan took too long. Try a clearer photo or search the meal manually."
              : backendFailureMessage || "Could not detect food in this image."
          );
        }
      }

      const detectionTerms = collectDetectionTerms(data);
      const bestMatch = findBestPakistaniDishMatch(detectionTerms, dietPreference);
      const dishName = data.foodName || data.food_name || detectionTerms[0] || "";
      const confidence = Number(data.confidence ?? data.score ?? data.probability ?? 0);
      const confidencePercent = confidence > 1 ? confidence : confidence * 100;
      const confidenceLine = confidencePercent > 0
        ? `\nConfidence: ${Math.round(confidencePercent)}%`
        : "";

      if ((data.success && dishName) || bestMatch) {
        setDetectedDishName(dishName);
        setFoodSearch(dishName || getFoodTitle(bestMatch));

        if (bestMatch) {
          setSelectedFoodItem(bestMatch);
          const calories = bestMatch.calories_kcal || 0;
          setCalorieInput(String(Math.round(calories * Math.max(0.5, toMealNumber(mealQuantity, 1)))));
          setShowFoodSearch(false);

          Alert.alert(
            "Food Detected",
            `Found: ${getFoodTitle(bestMatch)}\nCalories: ${calories} kcal${confidenceLine}\n\nYou can adjust the quantity and add the meal.`,
            [{ text: "OK" }]
          );
        } else {
          setShowFoodSearch(true);
          Alert.alert(
            "Food Detected",
            `Detected: ${dishName}${confidenceLine}\n\nPlease select from the search results or enter details manually.`,
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert("Detection Failed", data.message || "Could not detect a dish in the image. Please try another image or enter manually.");
      }
    } catch (error) {
      console.error("Image detection error:", error);
      Alert.alert(
        "Detection Failed",
        error instanceof Error
          ? error.message
          : "Failed to process the image. Please try again."
      );
    } finally {
      setIsDetectingDish(false);
    }
  }, [
    dietPreference,
    mealQuantity,
    setCalorieInput,
    setFoodSearch,
    setSelectedFoodItem,
    setShowFoodSearch,
  ]);

  return {
    isDetectingDish,
    detectedDishName,
    setDetectedDishName,
    detectDishFromImage,
  };
}
