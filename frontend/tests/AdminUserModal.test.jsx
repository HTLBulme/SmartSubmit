import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminUserModal from '../src/components/AdminUserModal.jsx';

const t = {
  roleStudentSingular: 'Schüler', roleTeacherSingular: 'Lehrer',
  editUserTitle: 'Benutzer bearbeiten', addUserTitle: 'Benutzer hinzufügen',
  emailAddress: 'E-Mail-Adresse', selectClass: 'Klasse auswählen',
  classesLabel: 'Klasse(n)', selectClassesHint: 'Klassen direkt auswählen (optional)',
  noClassesAvailable: 'Keine Klassen verfügbar.', noSubjectsAvailable: 'Keine Fächer verfügbar.',
  subjectsLabel: 'Fach / Fächer', selectSubjectsHint: 'Mehrere auswählen',
  initialPasswordNote: 'Anfangspasswort wie beim Import', close: 'Schließen',
  cancel: 'Abbrechen', saving: 'Speichern…', save: 'Speichern',
  firstName: 'Vorname', lastName: 'Nachname', classLbl: 'Klasse',
};

const baseProps = {
  open: true,
  user: null,
  classes: [
    { id: 7, name: '1AKIFT', year: 2026 },
    { id: 8, name: '2AKIFT', year: 2026 },
  ],
  subjects: [
    { id: 4, name: 'Mathematik', code: 'M' },
    { id: 5, name: 'Deutsch', code: 'D' },
  ],
  busy: false,
  error: '',
  t,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
};

describe('AdminUserModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits student fields and multiple classes without a password field', () => {
    const onSubmit = vi.fn();
    render(<AdminUserModal {...baseProps} userType="student" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: ' Anna ' } });
    fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: ' Test ' } });
    fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), { target: { value: 'anna@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Klasse' }));
    fireEvent.click(screen.getByLabelText('2AKIFT (2026/27)'));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(onSubmit).toHaveBeenCalledWith({
      firstName: 'Anna', lastName: 'Test', email: 'anna@example.com', classIds: [8],
    });
    expect(screen.queryByLabelText(/Passwort/i)).not.toBeInTheDocument();
  });

  it('pre-fills a teacher and submits changed subjects', () => {
    const onSubmit = vi.fn();
    const user = {
      id: 20, firstName: 'Tom', lastName: 'Lehrer', email: 'tom@example.com',
      userClasses: [
        { class: { id: 7, name: '1AKIFT', year: 2026 } },
        { class: { id: 8, name: '2AKIFT', year: 2026 } },
      ],
      userSubjects: [{ subject: { id: 4, name: 'Mathematik', code: 'M' } }],
    };
    render(<AdminUserModal {...baseProps} userType="teacher" user={user} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Klasse(n)' }));
    expect(screen.getByLabelText('1AKIFT (2026/27)')).toBeChecked();
    expect(screen.getByLabelText('2AKIFT (2026/27)')).toBeChecked();
    fireEvent.click(screen.getByLabelText('1AKIFT (2026/27)'));

    fireEvent.click(screen.getByRole('button', { name: 'Fach / Fächer' }));
    fireEvent.click(screen.getByLabelText('Deutsch (D)'));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(screen.getByLabelText('Vorname')).toHaveValue('Tom');
    expect(onSubmit).toHaveBeenCalledWith({
      firstName: 'Tom', lastName: 'Lehrer', email: 'tom@example.com', classIds: [8], subjectIds: [4, 5],
    });
  });

  it('restores all saved class and subject selections when reopened', () => {
    const user = {
      id: 21, firstName: 'Eva', lastName: 'Lehrerin', email: 'eva@example.com',
      userClasses: [{ class: { id: 7, name: '1AKIFT', year: 2026 } }, { class: { id: 8, name: '2AKIFT', year: 2026 } }],
      userSubjects: [{ subject: { id: 4, name: 'Mathematik', code: 'M' } }, { subject: { id: 5, name: 'Deutsch', code: 'D' } }],
    };
    const { rerender } = render(<AdminUserModal {...baseProps} open={false} userType="teacher" user={user} />);
    rerender(<AdminUserModal {...baseProps} open userType="teacher" user={user} />);

    fireEvent.click(screen.getByRole('button', { name: 'Klasse(n)' }));
    expect(screen.getByLabelText('1AKIFT (2026/27)')).toBeChecked();
    expect(screen.getByLabelText('2AKIFT (2026/27)')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Fach / Fächer' }));
    expect(screen.getByLabelText('Mathematik (M)')).toBeChecked();
    expect(screen.getByLabelText('Deutsch (D)')).toBeChecked();
  });

  it('pre-fills all classes when editing a student', () => {
    const user = {
      id: 22, firstName: 'Lena', lastName: 'Bauer', email: 'lena@example.com',
      userClasses: [{ class: { id: 7, name: '1AKIFT', year: 2026 } }, { class: { id: 8, name: '2AKIFT', year: 2026 } }],
    };
    render(<AdminUserModal {...baseProps} userType="student" user={user} />);
    fireEvent.click(screen.getByRole('button', { name: 'Klasse' }));
    expect(screen.getByLabelText('1AKIFT (2026/27)')).toBeChecked();
    expect(screen.getByLabelText('2AKIFT (2026/27)')).toBeChecked();
  });

  it('keeps add-teacher multiselects compact and allows empty selections', () => {
    const onSubmit = vi.fn();
    render(<AdminUserModal {...baseProps} userType="teacher" onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'Klasse(n)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fach / Fächer' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Klasse(n)' }));
    expect(screen.getByRole('listbox', { name: 'Klasse(n)' }).parentElement).toBe(document.body);
    fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Tom' } });
    fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: 'Lehrer' } });
    fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), { target: { value: 'tom@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(onSubmit).toHaveBeenCalledWith({
      firstName: 'Tom', lastName: 'Lehrer', email: 'tom@example.com', classIds: [], subjectIds: [],
    });
  });

  it('shows a backend validation error in the form', () => {
    render(<AdminUserModal {...baseProps} userType="student" error="E-Mail bereits vergeben." />);
    expect(screen.getByRole('alert')).toHaveTextContent('E-Mail bereits vergeben.');
  });
});
