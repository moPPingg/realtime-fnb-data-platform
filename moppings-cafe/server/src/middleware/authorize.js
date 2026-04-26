/**
 * Factory — returns Express middleware that checks for a required permission key.
 * Must be used AFTER authenticate().
 *
 * Usage:  router.get('/users', authenticate, authorize('manage_users'), handler)
 */
export function authorize(permissionKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!req.user.permissions.includes(permissionKey)) {
      return res.status(403).json({ error: `Missing permission: ${permissionKey}` });
    }
    next();
  };
}
