import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Login from '../src/pages/login.jsx';

vi.mock('axios');
vi.mock('../src/context/LanguageContext', () => ({ useLang: () => ['de'] }));

const user = (roles) => ({
  id: 1,
  email: 'test@example.com',
  roles: roles.map((name, index) => ({ id: index + 1, name })),
});

function renderLogin(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Login />
    </MemoryRouter>,
  );
}

function fillAndSubmit(identifier = 'test@example.com') {
  fireEvent.change(screen.getByPlaceholderText(/E-Mail-Adresse|Schul-Benutzername/i), {
    target: { value: identifier },
  });
  fireEvent.change(screen.getByPlaceholderText(/Passwort/i), {
    target: { value: 'testpass' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^Anmelden$/i }));
}

describe('Login Page post-auth role flow', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    axios.post.mockReset();
  });

  it('has no role selector before authentication', () => {
    renderLogin();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('opens the only assigned role for a local user', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { data: { token: 'local-token', user: user(['Student']) } } })
      .mockResolvedValueOnce({ data: { data: { role: 'Student' } } });

    renderLogin();
    fillAndSubmit();

    await waitFor(() => expect(sessionStorage.getItem('activeRole')).toBe('Student'));
    expect(axios.post.mock.calls[0][1]).toEqual({
      email: 'test@example.com',
      password: 'testpass',
      loginMethod: 'local',
    });
    expect(localStorage.getItem('role')).toBeNull();
  });

  it('shows only assigned roles for a local multi-role user', async () => {
    axios.post
      .mockResolvedValueOnce({
        data: { data: { token: 'multi-token', user: user(['Teacher', 'Admin']) } },
      })
      .mockResolvedValueOnce({ data: { data: { role: 'Teacher' } } });

    renderLogin();
    fillAndSubmit();

    expect(await screen.findByRole('heading', { name: /Bereich auswählen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lehrer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Schüler' })).not.toBeInTheDocument();
    expect(sessionStorage.getItem('activeRole')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Lehrer' }));
    await waitFor(() => expect(sessionStorage.getItem('activeRole')).toBe('Teacher'));
    expect(axios.post.mock.calls[1][1]).toEqual({ role: 'Teacher' });
  });

  it('uses the same one-role flow after LDAP authentication', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { data: { token: 'ldap-token', user: user(['Teacher']) } } })
      .mockResolvedValueOnce({ data: { data: { role: 'Teacher' } } });

    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /Mit LDAP anmelden/i }));
    fillAndSubmit('ldap-user');

    await waitFor(() => expect(sessionStorage.getItem('activeRole')).toBe('Teacher'));
    expect(axios.post.mock.calls[0][1]).toEqual({
      identifier: 'ldap-user',
      password: 'testpass',
      loginMethod: 'ldap',
    });
  });

  it('uses the same multi-role selector after LDAP authentication', async () => {
    axios.post.mockResolvedValueOnce({
      data: { data: { token: 'ldap-token', user: user(['Student', 'Teacher']) } },
    });

    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /Mit LDAP anmelden/i }));
    fillAndSubmit('ldap-user');

    expect(await screen.findByRole('button', { name: 'Schüler' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lehrer' })).toBeInTheDocument();
  });

  it('opens the only assigned role after Google OAuth', async () => {
    axios.post.mockResolvedValueOnce({ data: { data: { role: 'Student' } } });
    const query = new URLSearchParams({
      token: 'google-token',
      user: JSON.stringify(user(['Student'])),
    });

    renderLogin(`/?${query.toString()}`);

    await waitFor(() => expect(sessionStorage.getItem('activeRole')).toBe('Student'));
    expect(axios.post).toHaveBeenCalledWith(
      '/api/auth/select-role',
      { role: 'Student' },
      expect.objectContaining({ headers: { Authorization: 'Bearer google-token' } }),
    );
  });

  it('shows post-auth selection for a multi-role Google user', async () => {
    const query = new URLSearchParams({
      token: 'google-token',
      user: JSON.stringify(user(['Admin', 'Teacher'])),
    });

    renderLogin(`/?${query.toString()}`);

    expect(await screen.findByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lehrer' })).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('denies access when authentication returns no valid role', async () => {
    axios.post.mockResolvedValueOnce({
      data: { data: { token: 'no-role-token', user: user([]) } },
    });

    renderLogin();
    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/keine gültige Rolle/i);
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });
});
