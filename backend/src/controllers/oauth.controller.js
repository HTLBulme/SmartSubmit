const { generateToken } = require('../app.utils');

function serializeAuthenticatedUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    hasLocalPassword: Boolean(user.passwordHash),
    authMethod: 'google',
    roles: Array.isArray(user.userRoles)
      ? user.userRoles.map((userRole) => ({
          id: userRole.roleId,
          name: userRole.role.name
        }))
      : []
  };
}

function buildGoogleCallbackUrl(frontendUrl, token, user) {
  const userData = encodeURIComponent(JSON.stringify(serializeAuthenticatedUser(user)));
  return `${frontendUrl}/?token=${encodeURIComponent(token)}&user=${userData}`;
}

const googleCallback = (req, res) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const token = generateToken(req.user.id);
    return res.redirect(buildGoogleCallbackUrl(frontendUrl, token, req.user));
  } catch (error) {
    console.error('OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/?error=token_generation_failed`);
  }
};

module.exports = {
  buildGoogleCallbackUrl,
  googleCallback,
  serializeAuthenticatedUser
};
