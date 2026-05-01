export function requireStoreAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  
  if (req.user.role === 'admin') {
    return next();
  }

  const requestedStoreId = req.query.storeId || req.body.store_id || req.params.storeId;
  
  if (requestedStoreId && parseInt(requestedStoreId) !== req.user.storeId) {
    return res.status(403).json({ error: 'Access denied to this store' });
  }
  
  next();
}

export function validateStoreOwnership(inventoryRecord, user) {
  if (user.role === 'admin') return true;
  return inventoryRecord.store_id === user.storeId;
}