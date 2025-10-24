import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import React from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ChevronLeftIcon } from "react-native-heroicons/outline";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>My Profile</Text>
        
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="person" size={24} color="#26867C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={{
          alignItems: 'center',
          marginBottom: hp(4),
        }}>
          <View style={{
            width: hp(15),
            height: hp(15),
            borderRadius: hp(7.5),
            backgroundColor: 'white',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
            marginBottom: hp(2),
          }}>
            <Image 
              source={require("../../assets/images/Default_Profile.png")}
              style={{
                width: hp(12),
                height: hp(12),
                borderRadius: hp(6),
              }}
            />
          </View>
          
          <Text style={{
            fontSize: hp(2.8),
            fontWeight: 'bold',
            color: '#333',
            marginBottom: hp(0.5),
          }}>
            John Doe
          </Text>
          
          <Text style={{
            fontSize: hp(1.8),
            color: '#666',
          }}>
            john.doe@example.com
          </Text>
        </View>

        {/* Profile Stats */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginHorizontal: wp(8),
          marginBottom: hp(4),
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: '#FF6B6B' }}>12</Text>
            <Text style={{ fontSize: hp(1.6), color: '#666' }}>Workouts</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: '#FF6B6B' }}>5</Text>
            <Text style={{ fontSize: hp(1.6), color: '#666' }}>Favorites</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: '#FF6B6B' }}>24</Text>
            <Text style={{ fontSize: hp(1.6), color: '#666' }}>Days Active</Text>
          </View>
        </View>

        {/* Profile Options */}
        <View style={{
          marginHorizontal: wp(5),
        }}>
          {[
            { title: 'Personal Information', icon: '👤', color: '#4A90E2' },
            { title: 'Fitness Goals', icon: '🎯', color: '#50C878' },
            { title: 'Workout Preferences', icon: '💪', color: '#FF6B6B' },
            { title: 'Notifications', icon: '🔔', color: '#FFA500' },
            { title: 'Privacy Settings', icon: '🔒', color: '#9B59B6' },
            { title: 'Help & Support', icon: '❓', color: '#34495E' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{
                backgroundColor: 'white',
                marginBottom: hp(2),
                borderRadius: hp(2),
                padding: hp(2),
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => console.log(`Navigate to ${item.title}`)}
            >
              <View style={{
                width: hp(5),
                height: hp(5),
                borderRadius: hp(2.5),
                backgroundColor: item.color,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: wp(4),
              }}>
                <Text style={{ fontSize: hp(2.5) }}>{item.icon}</Text>
              </View>
              
              <Text style={{
                flex: 1,
                fontSize: hp(2),
                fontWeight: '600',
                color: '#333',
              }}>
                {item.title}
              </Text>
              
              <ChevronLeftIcon
                size={hp(2.5)}
                color="#999"
                strokeWidth={2}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: '#f8f8f8',
  },
  backButton: {
    width: hp(5),
    height: hp(5),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: hp(2.5),
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.5,
  },
  editButton: {
    width: hp(5),
    height: hp(5),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: hp(2.5),
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
