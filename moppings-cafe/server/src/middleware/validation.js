export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  return password && password.length >= 8;
}

export function validateRequired(fields) {
  return (req, res, next) => {
    const missing = fields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        fields: missing 
      });
    }
    next();
  };
}

export function validateUserCreate(req, res, next) {
  const { name, email, password, role_id } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  if (!validateEmail(email)) {
    errors.push('Invalid email format');
  }
  if (!validatePassword(password)) {
    errors.push('Password must be at least 8 characters');
  }
  if (!role_id || !Number.isInteger(Number(role_id))) {
    errors.push('Valid role_id is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  next();
}

export function validateInventory(req, res, next) {
  const { store_id, product_id, quantity, low_stock } = req.body;
  const errors = [];

  if (!store_id || !Number.isInteger(Number(store_id))) {
    errors.push('Valid store_id is required');
  }
  if (!product_id || !Number.isInteger(Number(product_id))) {
    errors.push('Valid product_id is required');
  }
  if (quantity === undefined || !Number.isInteger(Number(quantity)) || Number(quantity) < 0) {
    errors.push('Quantity must be a non-negative integer');
  }
  if (low_stock !== undefined && (!Number.isInteger(Number(low_stock)) || Number(low_stock) < 0)) {
    errors.push('Low stock threshold must be a non-negative integer');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  next();
}

export function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim().replace(/[<>]/g, '');
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  next();
}