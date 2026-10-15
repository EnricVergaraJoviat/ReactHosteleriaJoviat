import { fireEvent, render, screen } from '@testing-library/react';
import Sidebar from './Sidebar';

jest.mock('../../assets/icons/restaurants.svg', () => ({
  ReactComponent: (props) => require('react').createElement('svg', props),
}));
jest.mock('../../assets/icons/add-restaurant.svg', () => ({
  ReactComponent: (props) => require('react').createElement('svg', props),
}));

test('only authenticated administrators see the report immediately below Trello', () => {
  const onGenerateReport = jest.fn();
  const props = { isDesktop: true, onGenerateReport };
  const { rerender } = render(<Sidebar {...props} isAuthenticated isAdministrator />);
  const button = screen.getByRole('button', { name: 'Generar informe' });
  expect(screen.getByRole('link', { name: 'Veure Trello' }).closest('li').nextElementSibling).toContainElement(button);
  fireEvent.click(button);
  expect(onGenerateReport).toHaveBeenCalledTimes(1);
  rerender(<Sidebar {...props} isAuthenticated isAdministrator={false} />);
  expect(screen.queryByRole('button', { name: 'Generar informe' })).not.toBeInTheDocument();
  rerender(<Sidebar {...props} isAuthenticated={false} isAdministrator />);
  expect(screen.queryByRole('button', { name: 'Generar informe' })).not.toBeInTheDocument();
});
