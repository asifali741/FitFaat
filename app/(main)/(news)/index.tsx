import { useNews } from '@/contexts/NewsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

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
}

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

export default function NewsScreen() {
  const { news, loading, error, refreshNews } = useNews();
  const { isDarkMode } = useTheme();
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isDark = isDarkMode ?? false;
  const colors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    card: isDark ? '#2a2a2a' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#aaaaaa' : '#666666',
    border: isDark ? '#333333' : '#eeeeee',
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNews();
    setRefreshing(false);
  };

  const renderNewsCard = ({ item }: { item: NewsItem }) => (
    <TouchableOpacity
      style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => setSelectedNews(item)}
      activeOpacity={0.7}
    >
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={styles.newsImage}
        />
      )}

      <View style={styles.newsContent}>
        <View style={styles.categoryBadge}>
          <Ionicons
            name={getCategoryIcon(item.category) as any}
            size={Math.min(hp(1.7), wp(3.7))}
            color="white"
          />
          <Text
            style={[
              styles.categoryText,
              { backgroundColor: getCategoryColor(item.category) },
            ]}
          >
            {' '}
            {item.category}
          </Text>
        </View>

        <Text
          style={[styles.newsTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <Text
          style={[styles.newsDescription, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        <View style={styles.newsFooter}>
          <View style={styles.footerLeft}>
            {item.adminName && (
              <Text style={[styles.adminName, { color: colors.textSecondary }]}>
                By {item.adminName}
              </Text>
            )}
            {item.views !== undefined && (
              <Text style={[styles.views, { color: colors.textSecondary }]}>
                👁 {item.views} views
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={Math.min(hp(2.5), wp(5.4))} color={colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="newspaper-outline"
        size={Math.min(hp(7.8), wp(17))}
        color={colors.textSecondary}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No News Available
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Check back later for health, fitness, and wellness updates
      </Text>
    </View>
  );

  if (loading && news.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={news}
        renderItem={renderNewsCard}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor={colors.text}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Ionicons
                name="newspaper"
                size={Math.min(hp(3.9), wp(8.5))}
                color="#4CAF50"
              />
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Latest News
                </Text>
                <Text style={[styles.debugText, { color: colors.textSecondary }]}>
                  News Count: {news.length} | {loading ? 'Loading...' : 'Ready'}
                </Text>
              </View>
            </View>
            {error && (
              <View style={[styles.errorBanner, { borderColor: colors.border }]}>
                <Ionicons name="alert-circle" size={Math.min(hp(2.5), wp(5.4))} color="#FF5722" />
                <Text style={[styles.errorText]}>
                  Error: {error}
                </Text>
              </View>
            )}
          </>
        }
      />

      {/* News Detail Modal */}
      <Modal
        visible={!!selectedNews}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNews(null)}
      >
        <View
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          {/* Modal Header */}
          <View
            style={[styles.modalHeader, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <TouchableOpacity onPress={() => setSelectedNews(null)}>
              <Ionicons name="close" size={Math.min(hp(3), wp(6.4))} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              News Details
            </Text>
            <View style={{ width: wp(6.4) }} />
          </View>

          {/* Modal Content */}
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {selectedNews?.image && (
              <Image
                source={{ uri: selectedNews.image }}
                style={styles.modalImage}
              />
            )}

            <View style={styles.modalBody}>
              <View style={styles.categoryBadge}>
                <Ionicons
                  name={getCategoryIcon(selectedNews?.category || 'general') as any}
                  size={Math.min(hp(2), wp(4.3))}
                  color="white"
                />
                <Text
                  style={[
                    styles.categoryText,
                    {
                      backgroundColor: getCategoryColor(
                        selectedNews?.category || 'general'
                      ),
                    },
                  ]}
                >
                  {' '}
                  {selectedNews?.category}
                </Text>
              </View>

              <Text
                style={[styles.detailTitle, { color: colors.text }]}
              >
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

              <Text
                style={[styles.detailDescription, { color: colors.text }]}
              >
                {selectedNews?.description}
              </Text>

              {selectedNews?.views !== undefined && (
                <View style={styles.viewsSection}>
                  <Ionicons name="eye" size={Math.min(hp(2.2), wp(4.8))} color={colors.textSecondary} />
                  <Text style={[styles.viewsText, { color: colors.textSecondary }]}>
                    {selectedNews.views} people viewed this
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: hp(2.5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(2),
    gap: wp(3.2),
  },
  headerTitle: {
    fontSize: Math.min(hp(3.4), wp(7.5)),
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(3.2),
    marginBottom: hp(1.5),
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(1.2),
    borderRadius: wp(2.1),
    borderWidth: 1,
    borderColor: '#FF5722',
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    gap: wp(2.1),
  },
  errorText: {
    flex: 1,
    fontSize: Math.min(hp(1.8), wp(3.8)),
    color: '#FF5722',
    fontWeight: '500',
  },
  newsCard: {
    marginHorizontal: wp(3.2),
    marginVertical: hp(1),
    borderRadius: wp(3.2),
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(0.25) },
    shadowOpacity: 0.1,
    shadowRadius: wp(1.1),
  },
  newsImage: {
    width: '100%',
    height: hp(22),
    backgroundColor: '#f0f0f0',
  },
  newsContent: {
    padding: wp(3.2),
    gap: hp(1),
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    fontWeight: '600',
    color: 'white',
    paddingHorizontal: wp(2.1),
    paddingVertical: hp(0.5),
    borderRadius: wp(3.2),
    overflow: 'hidden',
  },
  newsTitle: {
    fontSize: Math.min(hp(2), wp(4.3)),
    fontWeight: '700',
  },
  newsDescription: {
    fontSize: Math.min(hp(1.6), wp(3.5)),
    lineHeight: hp(2.2),
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(1),
  },
  footerLeft: {
    flexDirection: 'column',
    gap: hp(0.5),
  },
  adminName: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    fontWeight: '500',
  },
  views: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5.4),
    paddingVertical: hp(7.4),
  },
  emptyTitle: {
    fontSize: Math.min(hp(2.5), wp(5.4)),
    fontWeight: '700',
    marginTop: hp(2),
  },
  emptySubtitle: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    marginTop: hp(1),
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4.3),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: Math.min(hp(2.2), wp(4.8)),
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: hp(37),
    backgroundColor: '#f0f0f0',
  },
  modalBody: {
    padding: wp(4.3),
    gap: hp(1.5),
  },
  detailTitle: {
    fontSize: Math.min(hp(2.7), wp(5.9)),
    fontWeight: '700',
    marginTop: hp(1),
    lineHeight: hp(3.4),
  },
  byLine: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    fontWeight: '500',
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
  },
  detailDescription: {
    fontSize: Math.min(hp(1.9), wp(4)),
    lineHeight: hp(2.7),
    marginTop: hp(1),
  },
  viewsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2),
    paddingTop: hp(2),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: wp(2.1),
  },
  viewsText: {
    fontSize: Math.min(hp(1.6), wp(3.5)),
    fontWeight: '500',
  },
  debugText: {
    fontSize: Math.min(hp(1.35), wp(3)),
    fontWeight: '400',
    marginTop: hp(0.5),
  },
});
