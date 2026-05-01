import * as analyticsService from '../services/analyticsService.js';

export async function getDashboardKPI(req, res, next) {
  try {
    const storeId = req.query.storeId ? parseInt(req.query.storeId) : null;
    const data = await analyticsService.getDashboardKPI(storeId);
    res.json(data);
  } catch (err) { next(err); }
}

export async function getTopSelling(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const storeId = req.query.storeId ? parseInt(req.query.storeId) : null;
    const data = await analyticsService.getTopSellingProducts(limit, storeId);
    res.json(data);
  } catch (err) { next(err); }
}

export async function getLowStock(req, res, next) {
  try {
    const storeId = req.query.storeId ? parseInt(req.query.storeId) : null;
    const data = await analyticsService.getLowStockItems(storeId);
    res.json(data);
  } catch (err) { next(err); }
}

export async function getInventoryByStore(req, res, next) {
  try {
    const data = await analyticsService.getInventoryByStore();
    res.json(data);
  } catch (err) { next(err); }
}

export async function getStoreComparison(req, res, next) {
  try {
    const data = await analyticsService.getStoreComparison();
    res.json(data);
  } catch (err) { next(err); }
}

export async function getCategoryBreakdown(req, res, next) {
  try {
    const data = await analyticsService.getCategoryBreakdown();
    res.json(data);
  } catch (err) { next(err); }
}

export async function getInventoryValue(req, res, next) {
  try {
    const data = await analyticsService.getInventoryValueByStore();
    res.json(data);
  } catch (err) { next(err); }
}

export async function getTransactionSummary(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await analyticsService.getTransactionSummary(days);
    res.json(data);
  } catch (err) { next(err); }
}

export async function getSalesTrend(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const [sales, imports] = await Promise.all([
      analyticsService.getSalesOverTime(days),
      analyticsService.getImportsOverTime(days)
    ]);
    res.json({ sales, imports });
  } catch (err) { next(err); }
}