// Use after authMiddleware: requireRole("recruiter")
const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({ message: `Only ${role}s can do this` });
  }
  next();
};

module.exports = requireRole;
