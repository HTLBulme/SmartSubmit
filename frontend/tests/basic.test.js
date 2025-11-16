// tests/api.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Frontend API calls', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.restoreAllMocks();
  });

  it('should return a successful login response', async () => {
    // Mock fetch to simulate API response
    const mockResponse = { success: true, message: 'Login successful' };

    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    ));

    // Example API call (replace with your actual frontend login function)
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: '123456' }),
    });

    const data = await response.json();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(data).toEqual(mockResponse);
  });

  it('should handle login failure', async () => {
    const mockErrorResponse = { success: false, message: 'Invalid credentials' };

    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      })
    ));

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpass' }),
    });

    const data = await response.json();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(data).toEqual(mockErrorResponse);
  });
});
