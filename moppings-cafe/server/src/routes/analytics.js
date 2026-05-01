import { Router } from 'express';
import * as analyticsCtrl from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);
router.use(authorize('view_dashboard'));

router.get('/kpi', (req, res, next) => {
  if (req.user.role !== 'admin') {
    req.query.storeId = req.user.storeId;
  }
  analyticsCtrl.getDashboardKPI(req, res, next);
});

router.get('/top-selling', (req, res, next) => {
  if (req.user.role !== 'admin') {
    req.query.storeId = req.user.storeId;
  }
  analyticsCtrl.getTopSelling(req, res, next);
});

router.get('/low-stock', (req, res, next) => {
  if (req.user.role !== 'admin') {
    req.query.storeId = req.user.storeId;
  }
  analyticsCtrl.getLowStock(req, res, next);
});

router.get('/by-store', analyticsCtrl.getInventoryByStore);
router.get('/store-comparison', analyticsCtrl.getStoreComparison);
router.get('/category-breakdown', analyticsCtrl.getCategoryBreakdown);
router.get('/inventory-value', analyticsCtrl.getInventoryValue);
router.get('/transaction-summary', analyticsCtrl.getTransactionSummary);
router.get('/sales-trend', analyticsCtrl.getSalesTrend);

export default router;