import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CalendarView from '../src/pages/CalendarView.jsx';
import { vi } from 'vitest';

vi.mock('../src/context/LanguageContext', () => ({
  useLang: () => ['en', () => {}],
}));

describe('CalendarView Component', () => {
  const assignments = [
    {
      id: 1,
      title: 'Test Assignment',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      submitted: false,
    },
  ];

  it('renders week view and shows assignment pill', () => {
    render(<CalendarView assignments={assignments} onAssignmentClick={vi.fn()} />);
    fireEvent.click(screen.getByText('Week'));

    expect(screen.getByText('Test Assignment')).toBeInTheDocument();
  });

  it('calls onAssignmentClick when assignment pill is clicked in week view', () => {
    const onAssignmentClick = vi.fn();
    render(<CalendarView assignments={assignments} onAssignmentClick={onAssignmentClick} />);
    fireEvent.click(screen.getByText('Week'));

    fireEvent.click(screen.getByText('Test Assignment'));
    expect(onAssignmentClick).toHaveBeenCalledWith(1);
  });

  it('changes calendar view mode when buttons are clicked', () => {
    render(<CalendarView assignments={assignments} onAssignmentClick={vi.fn()} />);

    fireEvent.click(screen.getByText('Week'));
    expect(screen.getByRole('heading')).toHaveTextContent(/Week/i);

    fireEvent.click(screen.getByText('Year'));
    expect(screen.getByRole('heading')).toHaveTextContent(/202/);
  });
});
