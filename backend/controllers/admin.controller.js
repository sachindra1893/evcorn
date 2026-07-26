/**
 * Enterprise Admin Operations Controller
 */
const Article = require('../models/Article');
const Vehicle = require('../models/Vehicle');
const Category = require('../models/Category');
const { isLocalFileDb, fileDb } = require('../config/database');
const { BadRequestError } = require('../errors/AppError');

// Activity Log In-Memory Stream
const activityLog = [
  { action: 'ADMIN_LOGIN', user: 'admin', timestamp: new Date().toISOString(), details: 'Admin session initiated' },
  { action: 'SYSTEM_STARTUP', user: 'system', timestamp: new Date().toISOString(), details: 'EVCorn Server Phase 14 Online' }
];

class AdminController {
  async getDashboard(req, res, next) {
    try {
      let totalVehicles = 0;
      let totalArticles = 0;
      let publishedArticles = 0;
      let draftArticles = 0;
      let totalBrands = 0;
      let totalCategories = 0;

      if (isLocalFileDb()) {
        const vehicles = fileDb.getVehicles();
        const articles = fileDb.getArticles();
        const categories = fileDb.getCategories();
        totalVehicles = vehicles.length;
        totalArticles = articles.length;
        publishedArticles = articles.filter(a => a.active && a.status !== 'draft').length;
        draftArticles = articles.filter(a => a.status === 'draft').length;
        totalBrands = categories.length;
        totalCategories = categories.length;
      } else {
        const [vCount, aCount, pCount, dCount, cCount] = await Promise.all([
          Vehicle.countDocuments(),
          Article.countDocuments(),
          Article.countDocuments({ status: 'published', active: true }),
          Article.countDocuments({ status: 'draft' }),
          Category.countDocuments()
        ]);
        totalVehicles = vCount;
        totalArticles = aCount;
        publishedArticles = pCount;
        draftArticles = dCount;
        totalBrands = cCount;
        totalCategories = cCount;
      }

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalVehicles,
            totalArticles,
            publishedArticles,
            draftArticles,
            totalBrands,
            totalCategories
          },
          systemHealth: {
            status: 'HEALTHY',
            uptimeSeconds: Math.floor(process.uptime()),
            memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
          },
          recentActivity: activityLog.slice(0, 10)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async executeBulkOperation(req, res, next) {
    try {
      const { action, ids, categoryId } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestError('Bulk operation requires a non-empty array of target ids.');
      }

      let updatedCount = 0;

      if (action === 'bulk_publish') {
        if (!isLocalFileDb()) {
          const result = await Article.updateMany({ _id: { $in: ids } }, { $set: { status: 'published', active: true } });
          updatedCount = result.modifiedCount;
        }
      } else if (action === 'bulk_archive') {
        if (!isLocalFileDb()) {
          const result = await Article.updateMany({ _id: { $in: ids } }, { $set: { status: 'archived', active: false } });
          updatedCount = result.modifiedCount;
        }
      } else if (action === 'bulk_category_update') {
        if (!categoryId) throw new BadRequestError('bulk_category_update requires categoryId.');
        if (!isLocalFileDb()) {
          const result = await Article.updateMany({ _id: { $in: ids } }, { $set: { categoryId } });
          updatedCount = result.modifiedCount;
        }
      } else {
        throw new BadRequestError(`Unsupported bulk action "${action}".`);
      }

      activityLog.unshift({
        action: `BULK_${action.toUpperCase()}`,
        user: 'admin',
        timestamp: new Date().toISOString(),
        details: `Processed ${ids.length} records.`
      });

      res.status(200).json({
        success: true,
        message: `Bulk operation ${action} executed successfully.`,
        processedCount: ids.length,
        modifiedCount: updatedCount
      });
    } catch (error) {
      next(error);
    }
  }

  async exportData(req, res, next) {
    try {
      const { entity, format } = req.query;
      let data = [];

      if (entity === 'vehicles') {
        data = isLocalFileDb() ? fileDb.getVehicles() : await Vehicle.find();
      } else {
        data = isLocalFileDb() ? fileDb.getArticles() : await Article.find();
      }

      if (format === 'csv') {
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(item => Object.values(item).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
        const csv = [headers, ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${entity || 'export'}.csv`);
        return res.status(200).send(csv);
      }

      res.status(200).json({
        success: true,
        entity: entity || 'articles',
        count: data.length,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async getActivityLog(req, res) {
    res.status(200).json({
      success: true,
      data: activityLog
    });
  }

  async getMediaLibrary(req, res, next) {
    try {
      const articles = isLocalFileDb() ? fileDb.getArticles() : await Article.find({}, 'id title imageUrl cloudinaryImage');
      const vehicles = isLocalFileDb() ? fileDb.getVehicles() : await Vehicle.find({}, 'id name imageUrl');

      const mediaItems = [];
      articles.forEach(a => {
        if (a.imageUrl) {
          mediaItems.push({
            id: a.id,
            url: a.imageUrl,
            type: 'article_hero',
            title: a.title,
            usedIn: `/articles/${a.id}`
          });
        }
      });
      vehicles.forEach(v => {
        if (v.imageUrl) {
          mediaItems.push({
            id: v.id,
            url: v.imageUrl,
            type: 'vehicle_hero',
            title: v.name,
            usedIn: `/evs`
          });
        }
      });

      res.status(200).json({
        success: true,
        totalItems: mediaItems.length,
        data: mediaItems
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
