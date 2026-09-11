const {
  buildGoogleCallbackUrl,
  serializeAuthenticatedUser,
} = require('../src/controllers/oauth.controller');

const googleUser = (roles) => ({
  id: 7,
  firstName: 'Grace',
  lastName: 'Hopper',
  email: 'grace@example.com',
  userRoles: roles.map((name, index) => ({ roleId: index + 1, role: { name } })),
  passwordHash: null,
});

describe('Google post-auth data', () => {
  it('returns the one locally assigned role without a role query parameter', () => {
    const user = serializeAuthenticatedUser(googleUser(['Student']));
    const url = new URL(buildGoogleCallbackUrl('http://frontend', 'token-1', googleUser(['Student'])));

    expect(user.roles.map(({ name }) => name)).toEqual(['Student']);
    expect(user.authMethod).toBe('google');
    expect(user.hasLocalPassword).toBe(false);
    expect(url.searchParams.has('role')).toBe(false);
  });

  it('returns every locally assigned role for post-auth selection', () => {
    const url = new URL(buildGoogleCallbackUrl(
      'http://frontend',
      'token-2',
      googleUser(['Teacher', 'Admin']),
    ));
    const user = JSON.parse(url.searchParams.get('user'));

    expect(user.roles.map(({ name }) => name)).toEqual(['Teacher', 'Admin']);
    expect(url.searchParams.has('role')).toBe(false);
  });
});
