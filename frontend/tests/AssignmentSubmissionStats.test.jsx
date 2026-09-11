import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentSubmissionStats from '../src/components/AssignmentSubmissionStats';

describe('AssignmentSubmissionStats', () => {
  it('shows compact submitted and missing student counts', () => {
    render(
      <AssignmentSubmissionStats
        studentCount={5}
        submittedCount={3}
        missingCount={2}
        submittedLabel="Abgegeben"
        missingLabel="Nicht abgegeben"
      />,
    );

    expect(screen.getByTitle('Abgegeben')).toHaveTextContent('✓ 3');
    expect(screen.getByTitle('Nicht abgegeben')).toHaveTextContent('✕ 2');
    expect(screen.getByLabelText('Abgegeben: 3 / 5; Nicht abgegeben: 2')).toBeInTheDocument();
  });

  it('renders an empty class unambiguously', () => {
    render(
      <AssignmentSubmissionStats
        studentCount={0}
        submittedCount={0}
        missingCount={0}
        submittedLabel="Submitted"
        missingLabel="Not submitted"
      />,
    );

    expect(screen.getByTitle('Submitted')).toHaveTextContent('✓ 0');
    expect(screen.getByTitle('Not submitted')).toHaveTextContent('✕ 0');
  });
});
