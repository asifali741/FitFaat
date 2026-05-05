import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

interface NewsItem {
  _id: string;
  id?: string;
  title: string;
  description: string;
  image?: string;
  category: 'health' | 'fitness' | 'nutrition' | 'wellness' | 'general';
  adminName?: string;
  views?: number;
  createdAt?: string;
  isPublished?: boolean;
}

interface NewsModalPopupProps {
  visible: boolean;
  onClose: () => void;
  newsList: NewsItem[];
  onNewsRead?: (newsId: string) => void;
}

const { width, height } = Dimensions.get('window');

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    health: '#4CAF50',
    fitness: '#FF5722',
    nutrition: '#FF9800',
    wellness: '#9C27B0',
    general: '#2196F3',
  };
  return colors[category] || '#666';
};

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    health: 'medical',
    fitness: 'dumbbell',
    nutrition: 'restaurant',
    wellness: 'leaf',
    general: 'information-circle',
  };
  return icons[category] || 'information-circle';
};

export default function NewsModalPopup({
  visible,
  onClose,
  newsList,
  onNewsRead,
}: NewsModalPopupProps) {
  const { isDarkMode } = useTheme();
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const isDark = isDarkMode ?? false;
  const colors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    card: isDark ? '#2a2a2a' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#aaaaaa' : '#666666',
    border: isDark ? '#333333' : '#eeeeee',
  };

  const handleNewsSelect = (news: NewsItem) => {
    setSelectedNews(news);
    // Mark as read
    if (onNewsRead) {
      onNewsRead(news._id || news.id || '');
    }
  };

  const handleClose = () => {
    setSelectedNews(null);
    onClose();
  };

  if (!selectedNews) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                📰 News Updates
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* News List */}
            {newsList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper" size={60} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  No news available
                </Text>
                <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                  Check back later for updates
                </Text>
              </View>
            ) : (
              <FlatList
                data={newsList}
                keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.newsItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                    onPress={() => handleNewsSelect(item)}
                  >
                    {item.image && (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.newsItemImage}
                      />
                    )}
                    <View style={styles.newsItemContent}>
                      <View style={styles.newsItemHeader}>
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: getCategoryColor(item.category) },
                          ]}
                        >
                          <Ionicons
                            name={getCategoryIcon(item.category) as any}
                            size={12}
                            color="white"
                          />
                        </View>
                        <Text style={[styles.newsItemTitle, { color: colors.text }]}>
                          {item.title}
                        </Text>
                      </View>
                      <Text
                        style={[styles.newsItemDescription, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                      <View style={styles.newsItemFooter}>
                        <Text style={[styles.newsItemMeta, { color: colors.textSecondary }]}>
                          {item.adminName && `By ${item.adminName}`}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                scrollEnabled={true}
                nestedScrollEnabled={true}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // Detail View
  return (
    <Modal
      visible={visible && !!selectedNews}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.detailModalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.detailModalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.detailModalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelectedNews(null)}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.detailModalTitle, { color: colors.text }]}>
              News Details
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.detailModalContent} showsVerticalScrollIndicator={false}>
            {selectedNews?.image && (
              <Image
                source={{ uri: selectedNews.image }}
                style={styles.detailNewsImage}
              />
            )}

            <View style={styles.detailContentBody}>
              <View style={styles.categoryBadgeDetail}>
                <Ionicons
                  name={getCategoryIcon(selectedNews?.category || 'general') as any}
                  size={16}
                  color="white"
                />
                <Text
                  style={[
                    styles.categoryTextDetail,
                    {
                      backgroundColor: getCategoryColor(selectedNews?.category || 'general'),
                      color: 'white',
                    },
                  ]}
                >
                  {selectedNews?.category}
                </Text>
              </View>

              <Text style={[styles.detailTitle, { color: colors.text }]}>
                {selectedNews?.title}
              </Text>

              {selectedNews?.adminName && (
                <Text style={[styles.byLine, { color: colors.textSecondary }]}>
                  By {selectedNews.adminName}
                </Text>
              )}

              {selectedNews?.createdAt && (
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  {new Date(selectedNews.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              )}

              <Text style={[styles.detailDescription, { color: colors.text }]}>
                {selectedNews?.description}
              </Text>

              {selectedNews?.views !== undefined && (
                <View style={styles.viewsSection}>
                  <Ionicons name="eye" size={18} color={colors.textSecondary} />
                  <Text style={[styles.viewsText, { color: colors.textSecondary }]}>
                    {selectedNews.views} views
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // List Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: hp(85),
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    paddingTop: hp(2),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingBottom: hp(2),
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: hp(2.5),
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  emptyText: {
    fontSize: hp(2.2),
    fontWeight: '600',
    marginTop: hp(1.5),
  },
  emptySubText: {
    fontSize: hp(1.8),
    marginTop: hp(1),
  },

  // News Item Styles
  newsItem: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  newsItemImage: {
    width: wp(15),
    height: wp(15),
    borderRadius: wp(2),
    marginRight: wp(3),
  },
  newsItemContent: {
    flex: 1,
  },
  newsItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.8),
    gap: wp(2),
  },
  categoryBadge: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsItemTitle: {
    flex: 1,
    fontSize: hp(1.8),
    fontWeight: '600',
  },
  newsItemDescription: {
    fontSize: hp(1.5),
    marginBottom: hp(0.8),
  },
  newsItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsItemMeta: {
    fontSize: hp(1.4),
  },

  // Detail Modal Styles
  detailModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailModalContainer: {
    height: hp(90),
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
  },
  detailModalTitle: {
    fontSize: hp(2.2),
    fontWeight: '600',
  },
  detailModalContent: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  detailNewsImage: {
    width: '100%',
    height: hp(25),
    borderRadius: wp(3),
    marginVertical: hp(1.5),
  },
  detailContentBody: {
    paddingVertical: hp(1.5),
    paddingBottom: hp(4),
  },
  categoryBadgeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginBottom: hp(1.5),
    alignSelf: 'flex-start',
  },
  categoryTextDetail: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: wp(1.5),
    fontSize: hp(1.5),
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: hp(2.8),
    fontWeight: 'bold',
    marginBottom: hp(1),
  },
  byLine: {
    fontSize: hp(1.6),
    marginBottom: hp(0.8),
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: hp(1.5),
    marginBottom: hp(2),
  },
  detailDescription: {
    fontSize: hp(1.9),
    lineHeight: hp(3),
    marginBottom: hp(2),
  },
  viewsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(2),
    paddingTop: hp(2),
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  viewsText: {
    fontSize: hp(1.6),
  },
});
