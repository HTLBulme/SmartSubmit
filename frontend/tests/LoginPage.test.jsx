import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Login from '../src/pages/login.jsx';

vi.mock('axios');
vi.mock('../src/context/LanguageContext', () => ({ useLang: () => ['de'] }));

describe('Login Page', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('submits login form and stores token', async () => {
    axios.post.mockResolvedValue({
      data: { data: { token: 'abc123', user: { userRoles: [{ name: 'Student' }] } } }
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/E-Mail-Adresse/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Passwort/i), { target: { value: 'testpass' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Student' } });

    const loginButtons = screen.getAllByRole('button', { name: /Anmelden/i });
    const submitButton = loginButtons.find((button) => button.getAttribute('type') === 'submit');
    fireEvent.click(submitButton);

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(localStorage.getItem('token')).toBe('abc123');
    expect(sessionStorage.getItem('token')).toBe('abc123');
  });

  it('shows an error message on failed login', async () => {
    axios.post.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid credentials' } } });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/E-Mail-Adresse/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Passwort/i), { target: { value: 'wrongpass' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Student' } });

    const loginButtons = screen.getAllByRole('button', { name: /Anmelden/i });
    const submitButton = loginButtons.find((button) => button.getAttribute('type') === 'submit');
    fireEvent.click(submitButton);

    await waitFor(() => expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument());
  });
});
