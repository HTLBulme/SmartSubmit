import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import UploadUsers from '../src/pages/admin.jsx';

vi.mock('axios');
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() },
}));
vi.mock('../src/context/LanguageContext', () => ({ useLang: () => ['de'] }));

function selectFile(rows) {
  XLSX.utils.sheet_to_json.mockReturnValue(rows);
  const fileInput = document.querySelector('#fileInput');
  fireEvent.change(fileInput, { target: { files: [new File(['xlsx'], 'users.xlsx')] } });
}

function renderImport() {
  axios.get.mockResolvedValue({ data: { success: true, data: [] } });
  XLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
  class TestFileReader {
    readAsArrayBuffer() {
      this.onload({ target: { result: new ArrayBuffer(1) } });
    }
  }
  vi.stubGlobal('FileReader', TestFileReader);
  sessionStorage.setItem('token', 'admin-token');
  return render(<UploadUsers />);
}

const validStudentRow = {
  vorname: 'Lena', nachname: 'Bauer', email: 'lena@example.com', klasse: '3A', jahrgang: 2026,
};

describe('Admin import validation and result states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('does not send a request when required headers are missing', async () => {
    renderImport();
    selectFile([{ Vorname: 'Lena', Nachname: 'Bauer', 'E-Mail': 'lena@example.com', Klasse: '3A' }]);

    fireEvent.click(screen.getByRole('button', { name: /Daten hochladen/i }));

    expect(await screen.findByText(/Fehlende Spalten:.*vorname/i)).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('shows a green full-success result with the imported count', async () => {
    renderImport();
    selectFile([validStudentRow]);
    axios.post.mockResolvedValueOnce({
      data: { success: true, data: { created: [validStudentRow], updated: [validStudentRow, validStudentRow], failed: [] } },
    });

    fireEvent.click(screen.getByRole('button', { name: /Daten hochladen/i }));

    expect(await screen.findByText('1 Benutzer neu angelegt, 2 Benutzer aktualisiert.')).toBeInTheDocument();
    expect(screen.getByText('1 Benutzer neu angelegt, 2 Benutzer aktualisiert.').closest('.import-result'))
      .toHaveClass('import-result-success');
  });

  it('shows warning and row reasons for a partial result', async () => {
    renderImport();
    selectFile([validStudentRow]);
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: { created: [validStudentRow], updated: [], failed: [{ row: {}, reason: 'Invalid email' }] },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Daten hochladen/i }));

    expect(await screen.findByText('1 Benutzer neu angelegt, 0 Benutzer aktualisiert, 1 fehlgeschlagen.')).toBeInTheDocument();
    expect(screen.getByText(/Invalid email/)).toBeInTheDocument();
    expect(screen.getByText(/1 Benutzer neu angelegt/).closest('.import-result'))
      .toHaveClass('import-result-warning');
  });

  it('shows an error and reasons when every row fails', async () => {
    renderImport();
    selectFile([validStudentRow]);
    axios.post.mockResolvedValueOnce({
      data: { success: true, data: { created: [], updated: [], failed: [{ row: {}, reason: 'Invalid email' }] } },
    });

    fireEvent.click(screen.getByRole('button', { name: /Daten hochladen/i }));

    await waitFor(() => expect(screen.getByText('Keine Benutzer wurden importiert.')).toBeInTheDocument());
    expect(screen.getByText(/Invalid email/)).toBeInTheDocument();
    expect(screen.getByText('Keine Benutzer wurden importiert.').closest('.import-result'))
      .toHaveClass('import-result-error');
  });
});
