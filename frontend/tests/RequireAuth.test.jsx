import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../src/App.jsx';

function renderProtected(allowedRoles = ['Teacher']) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/" element={<div>login-page</div>} />
        <Route
          path="/protected"
          element={(
            <RequireAuth allowedRoles={allowedRoles}>
              <div>protected-page</div>
            </RequireAuth>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('keeps access for an active role assigned to the user', () => {
    sessionStorage.setItem('token', 'token');
    sessionStorage.setItem('activeRole', 'Teacher');
    localStorage.setItem('user', JSON.stringify({ roles: [{ name: 'Teacher' }] }));

    renderProtected();
    expect(screen.getByText('protected-page')).toBeInTheDocument();
  });

  it('rejects a forged active role even when the route allows it', () => {
    sessionStorage.setItem('token', 'token');
    sessionStorage.setItem('activeRole', 'Teacher');
    localStorage.setItem('user', JSON.stringify({ roles: [{ name: 'Student' }] }));

    renderProtected();
    expect(screen.getByText('login-page')).toBeInTheDocument();
    expect(screen.queryByText('protected-page')).not.toBeInTheDocument();
  });

  it('still rejects access without a token', () => {
    sessionStorage.setItem('activeRole', 'Teacher');
    localStorage.setItem('user', JSON.stringify({ roles: [{ name: 'Teacher' }] }));

    renderProtected();
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });
});
