import News from '../models/News.js';
import { sendNewsNotification } from '../services/notificationService.js';

// @route   POST /api/admin/news
// @desc    Create a new news
// @access  Private (Admin only)
export const createNews = async (req, res) => {
  try {
    const { title, description, image, category } = req.body;
    const adminId = req.user?.id;
    const adminName = req.user?.name || 'Admin';

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Create news
    const news = await News.create({
      title,
      description,
      image,
      category: category || 'general',
      adminId,
      adminName
    });

    res.status(201).json({
      success: true,
      message: 'News created successfully',
      data: news
    });
  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating news'
    });
  }
};

// @route   GET /api/admin/news
// @desc    Get all news with pagination
// @access  Private (Admin only)
export const getAllNews = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get total count
    const total = await News.countDocuments(query);

    // Get news with pagination
    const news = await News.find(query)
      .populate('adminId', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: news,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching news'
    });
  }
};

// @route   GET /api/admin/news/:id
// @desc    Get specific news details
// @access  Private (Admin only)
export const getNewsDetails = async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('adminId', 'name email');

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    res.json({
      success: true,
      data: news
    });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching news'
    });
  }
};

// @route   PUT /api/admin/news/:id
// @desc    Update news
// @access  Private (Admin only)
export const updateNews = async (req, res) => {
  try {
    const { title, description, image, category, isPublished } = req.body;

    let news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    // Update fields
    if (title) news.title = title;
    if (description) news.description = description;
    if (image) news.image = image;
    if (category) news.category = category;
    if (isPublished !== undefined) news.isPublished = isPublished;

    await news.save();

    res.json({
      success: true,
      message: 'News updated successfully',
      data: news
    });
  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating news'
    });
  }
};

// @route   DELETE /api/admin/news/:id
// @desc    Delete news
// @access  Private (Admin only)
export const deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    res.json({
      success: true,
      message: 'News deleted successfully',
      data: news
    });
  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting news'
    });
  }
};

// @route   PUT /api/admin/news/:id/publish
// @desc    Publish/unpublish news
// @access  Private (Admin only)
export const publishNews = async (req, res) => {
  try {
    const { isPublished } = req.body;

    const news = await News.findByIdAndUpdate(
      req.params.id,
      { isPublished: isPublished !== false },
      { new: true }
    );

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    // Send push notification when news is published
    if (isPublished !== false) {
      console.log('📢 Sending push notifications for news:', news.title);
      try {
        await sendNewsNotification(news.title, news.description);
        console.log('✅ Push notifications sent successfully');
      } catch (notificationError) {
        console.error('⚠️ Failed to send notifications:', notificationError);
        // Don't fail the request, but log the error
      }
    }

    res.json({
      success: true,
      message: `News ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: news
    });
  } catch (error) {
    console.error('Publish news error:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing news'
    });
  }
};

// @route   GET /api/news
// @desc    Get all published news (for users)
// @access  Public
export const getPublishedNews = async (req, res) => {
  try {
    const { page = 1, limit = 10, category = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = { isPublished: true };
    if (category !== 'all') {
      query.category = category;
    }

    // Get total count
    const total = await News.countDocuments(query);

    // Get published news
    const news = await News.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .select('title description image category adminName views createdAt');

    res.json({
      success: true,
      data: news,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get published news error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching news'
    });
  }
};
