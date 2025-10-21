import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllFavorites = async () => {
  try {
    await AsyncStorage.removeItem('favoriteExercises');
    console.log('All favorites cleared');
    return true;
  } catch (error) {
    console.error('Error clearing favorites:', error);
    return false;
  }
};

export const logAllFavorites = async () => {
  try {
    const favorites = await AsyncStorage.getItem('favoriteExercises');
    if (favorites) {
      const favoritesList = JSON.parse(favorites);
      console.log('=== ALL FAVORITES ===');
      favoritesList.forEach((fav, index) => {
        console.log(`${index + 1}. ${fav.name} (ID: ${fav.id})`);
      });
      console.log(`Total: ${favoritesList.length}`);
    } else {
      console.log('No favorites found');
    }
  } catch (error) {
    console.error('Error logging favorites:', error);
  }
};