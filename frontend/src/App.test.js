import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SecureFlow dashboard header', () => {
  render(<App />);
  expect(screen.getByText(/SecureFlow/i)).toBeInTheDocument();
});
