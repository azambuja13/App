import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { EventForm } from './EventForm.jsx';
describe('EventForm', () => {
  test('renderiza campos de convidados e meses corretamente', () => {
    const mockOnGuestsChange = vi.fn();
    const mockOnMonthsChange = vi.fn();
    render(/*#__PURE__*/React.createElement(EventForm, {
      guests: 50,
      onGuestsChange: mockOnGuestsChange,
      monthsUntilEvent: 0,
      onMonthsUntilEventChange: mockOnMonthsChange
    }));

    // Verificar se o campo de convidados está presente
    const guestsInput = screen.getByDisplayValue('50');
    expect(guestsInput).toBeInTheDocument();
    expect(guestsInput).toHaveAttribute('type', 'number');
    expect(guestsInput).toHaveAttribute('min', '1');

    // Verificar se o campo de meses está presente
    const monthsInput = screen.getByDisplayValue('0');
    expect(monthsInput).toBeInTheDocument();
    expect(monthsInput).toHaveAttribute('type', 'number');
    expect(monthsInput).toHaveAttribute('min', '0');
  });
  test('chama callback ao alterar número de convidados', async () => {
    const user = userEvent.setup();
    const mockOnGuestsChange = vi.fn();
    const mockOnMonthsChange = vi.fn();
    render(/*#__PURE__*/React.createElement(EventForm, {
      guests: 50,
      onGuestsChange: mockOnGuestsChange,
      monthsUntilEvent: 0,
      onMonthsUntilEventChange: mockOnMonthsChange
    }));
    const guestsInput = screen.getByDisplayValue('50');
    await user.clear(guestsInput);
    await user.type(guestsInput, '100');
    expect(mockOnGuestsChange).toHaveBeenCalled();
  });
  test('chama callback ao alterar meses até evento', async () => {
    const user = userEvent.setup();
    const mockOnGuestsChange = vi.fn();
    const mockOnMonthsChange = vi.fn();
    render(/*#__PURE__*/React.createElement(EventForm, {
      guests: 50,
      onGuestsChange: mockOnGuestsChange,
      monthsUntilEvent: 0,
      onMonthsUntilEventChange: mockOnMonthsChange
    }));
    const monthsInput = screen.getByDisplayValue('0');
    await user.clear(monthsInput);
    await user.type(monthsInput, '6');
    expect(mockOnMonthsChange).toHaveBeenCalled();
  });
  test('não exibe mensagem de correção quando meses é 0', () => {
    const mockOnGuestsChange = vi.fn();
    const mockOnMonthsChange = vi.fn();
    render(/*#__PURE__*/React.createElement(EventForm, {
      guests: 50,
      onGuestsChange: mockOnGuestsChange,
      monthsUntilEvent: 0,
      onMonthsUntilEventChange: mockOnMonthsChange
    }));

    // Não deve existir mensagem de correção
    expect(screen.queryByText(/Correção:/)).not.toBeInTheDocument();
  });
  test('exibe mensagem de correção quando meses > 0', () => {
    const mockOnGuestsChange = vi.fn();
    const mockOnMonthsChange = vi.fn();
    render(/*#__PURE__*/React.createElement(EventForm, {
      guests: 50,
      onGuestsChange: mockOnGuestsChange,
      monthsUntilEvent: 6,
      onMonthsUntilEventChange: mockOnMonthsChange
    }));

    // Deve exibir mensagem de correção
    const correctionMessage = screen.getByText(/Correção:/);
    expect(correctionMessage).toBeInTheDocument();
    expect(correctionMessage.textContent).toContain('%');
  });
  test('calcula correção de inflação corretamente', () => {
    const mockOnGuestsChange = vi.fn();
    const mockOnMonthsChange = vi.fn();
    render(/*#__PURE__*/React.createElement(EventForm, {
      guests: 50,
      onGuestsChange: mockOnGuestsChange,
      monthsUntilEvent: 12,
      onMonthsUntilEventChange: mockOnMonthsChange
    }));

    // 12 meses = 1.01^12 - 1 = 0.126825... = 12.68%
    const correctionMessage = screen.getByText(/Correção:/);
    expect(correctionMessage.textContent).toMatch(/12\.68%/);
  });
  test('renderiza ícones corretamente', () => {
    const mockOnGuestsChange = vi.fn();
    const mockOnMonthsChange = vi.fn();
    const {
      container
    } = render(/*#__PURE__*/React.createElement(EventForm, {
      guests: 50,
      onGuestsChange: mockOnGuestsChange,
      monthsUntilEvent: 0,
      onMonthsUntilEventChange: mockOnMonthsChange
    }));

    // Verificar se os SVGs dos ícones estão presentes
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2); // Ícone de users e trending
  });
  test('labels estão associados aos inputs corretamente', () => {
    const mockOnGuestsChange = vi.fn();
    const mockOnMonthsChange = vi.fn();
    render(/*#__PURE__*/React.createElement(EventForm, {
      guests: 50,
      onGuestsChange: mockOnGuestsChange,
      monthsUntilEvent: 0,
      onMonthsUntilEventChange: mockOnMonthsChange
    }));

    // Verificar se as labels estão presentes
    expect(screen.getByText('Convidados')).toBeInTheDocument();
    expect(screen.getByText('Meses')).toBeInTheDocument();
  });
  test('trata valores não numéricos corretamente', async () => {
    const user = userEvent.setup();
    const mockOnGuestsChange = vi.fn();
    const mockOnMonthsChange = vi.fn();
    render(/*#__PURE__*/React.createElement(EventForm, {
      guests: 50,
      onGuestsChange: mockOnGuestsChange,
      monthsUntilEvent: 0,
      onMonthsUntilEventChange: mockOnMonthsChange
    }));
    const guestsInput = screen.getByDisplayValue('50');
    await user.clear(guestsInput);
    await user.type(guestsInput, 'abc');

    // Deve ter chamado com 0 (fallback para valores inválidos)
    expect(mockOnGuestsChange).toHaveBeenCalledWith(0);
  });
});

// Expor ao window para uso com Babel
window.EventForm.test = EventForm.test;