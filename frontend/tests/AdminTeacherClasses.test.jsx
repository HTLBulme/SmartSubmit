import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import UploadUsers from '../src/pages/admin.jsx';

vi.mock('axios');
vi.mock('xlsx', () => ({ read: vi.fn(), utils: { sheet_to_json: vi.fn() } }));
vi.mock('../src/context/LanguageContext', () => ({ useLang: () => ['de'] }));

describe('Admin teacher class display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem('token', 'admin-token');
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/api/admin/classes')) {
        return Promise.resolve({ data: { success: true, data: [
          { id: 7, name: '3AKIFT', year: 2026 },
          { id: 8, name: '4AKIFT', year: 2026 },
        ] } });
      }
      if (url.endsWith('/api/admin/subjects')) {
        return Promise.resolve({ data: { success: true, data: [{ id: 4, name: 'Mathematik', code: 'M' }] } });
      }
      if (url.endsWith('/api/admin/teachers')) {
        return Promise.resolve({ data: { success: true, data: [{
          id: 20,
          firstName: 'Tom',
          lastName: 'Lehrer',
          email: 'tom@example.com',
          userClasses: [
            { class: { id: 7, name: '3AKIFT', year: 2026 } },
            { class: { id: 8, name: '4AKIFT', year: 2026 } },
          ],
          userSubjects: [{ subject: { id: 4, code: 'M' } }],
        }] } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  it('renders all teacher classes with formatted school years', async () => {
    render(<UploadUsers />);
    fireEvent.click(screen.getByRole('button', { name: /Lehrer/ }));

    await waitFor(() => expect(screen.getByText('tom@example.com')).toBeInTheDocument());
    expect(screen.getByText('3AKIFT (2026/27), 4AKIFT (2026/27)')).toBeInTheDocument();
    expect(screen.getByText('Klasse(n)')).toBeInTheDocument();
  });
});
