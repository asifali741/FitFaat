import { useNews } from '@/contexts/NewsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
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

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 24;

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
            size={14}
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
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="newspaper-outline"
        size={64}
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
                size={32}
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
                <Ionicons name="alert-circle" size={20} color="#FF5722" />
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
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              News Details
            </Text>
            <View style={{ width: 24 }} />
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
                  size={16}
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
                  <Ionicons name="eye" size={18} color={colors.textSecondary} />
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
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5722',
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF5722',
    fontWeight: '500',
  },
  newsCard: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newsImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  newsContent: {
    padding: 12,
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  newsDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  footerLeft: {
    flexDirection: 'column',
    gap: 4,
  },
  adminName: {
    fontSize: 12,
    fontWeight: '500',
  },
  views: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  modalBody: {
    padding: 16,
    gap: 12,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
    lineHeight: 28,
  },
  byLine: {
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 12,
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  viewsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: 8,
  },
  viewsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  debugText: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 4,
  },
});
