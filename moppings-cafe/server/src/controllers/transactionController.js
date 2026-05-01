import * as transactionService from '../services/transactionService.js';

export async function list(req, res, next) {
  try {
    const { storeId, type, page, limit: queryLimit } = req.query;
    
    let effectiveStoreId = storeId ? parseInt(storeId) : undefined;
    if (req.user.role !== 'admin' && !effectiveStoreId) {
      effectiveStoreId = req.user.storeId;
    }
    
    const pageNum = parseInt(page) || 1;
    const limit = parseInt(queryLimit) || 20;
    const offset = (pageNum - 1) * limit;

    const result = await transactionService.listTransactions({
      storeId: effectiveStoreId,
      type,
      limit,
      offset,
    });
    
    const total = result.count || result.data?.length || 0;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      data: result.data || result,
      pagination: {
        page: pageNum,
        limit,
        total,
        pages: totalPages
      }
    });
  } catch (err) { next(err); }
}

export function create(io) {
  return async (req, res, next) => {
    try {
      const { store_id, product_id, change_amount, type } = req.body;
      
      if (!store_id || !product_id || change_amount === undefined || !type) {
        return res.status(400).json({ 
          error: 'store_id, product_id, change_amount, type are required' 
        });
      }

      if (!['import', 'sale', 'adjustment'].includes(type)) {
        return res.status(400).json({ 
          error: 'type must be one of: import, sale, adjustment' 
        });
      }

      if (req.user.role !== 'admin' && store_id !== req.user.storeId) {
        return res.status(403).json({ error: 'Access denied to this store' });
      }

      const result = await transactionService.createTransaction(
        store_id,
        product_id,
        change_amount,
        type,
        req.user.id
      );

      io.emit('inventory:updated', result.inventory);
      io.emit('transaction:created', result.transaction);

      res.status(201).json(result);
    } catch (err) { next(err); }
  };
}

export async function getById(req, res, next) {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (err) { next(err); }
}

export async function getStats(req, res, next) {
  try {
    const { storeId, productId } = req.query;
    const stats = await transactionService.getTransactionStats(
      storeId ? parseInt(storeId) : undefined,
      productId ? parseInt(productId) : undefined
    );
    res.json(stats);
  } catch (err) { next(err); }
}