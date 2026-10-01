function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { SavedEventsList } from './SavedEventsList.jsx';
describe('SavedEventsList', () => {
  const mockEvents = [{
    id: 'event-1',
    name: 'Churrasco Corporativo',
    eventDate: '2025-12-25',
    updatedAt: '2025-10-10T10:00:00Z',
    data: {
      guests: 100
    },
    results: {
      totalWithInflation: 15000.0,
      pricePerPerson: 150.0
    }
  }, {
    id: 'event-2',
    name: 'Festa de Aniversário',
    eventDate: '2025-11-15',
    updatedAt: '2025-10-11T12:00:00Z',
    data: {
      guests: 50
    },
    results: {
      totalWithInflation: 7500.0,
      pricePerPerson: 150.0
    }
  }];
  const defaultProps = {
    savedEvents: mockEvents,
    currentEventId: 'event-1',
    onLoadEvent: vi.fn(),
    onDuplicateEvent: vi.fn(),
    onDeleteEvent: vi.fn(),
    onExportEvents: vi.fn(),
    onClose: vi.fn()
  };
  test('renderiza título corretamente', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    expect(screen.getByText('📋 Eventos Salvos')).toBeInTheDocument();
  });
  test('renderiza botão de fechar (×) no header', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    const closeButtons = screen.getAllByText('×');
    expect(closeButtons[0]).toBeInTheDocument();
  });
  test('exibe mensagem quando não há eventos salvos', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, _extends({}, defaultProps, {
      savedEvents: []
    })));
    expect(screen.getByText('📋')).toBeInTheDocument();
    expect(screen.getByText('Nenhum evento salvo ainda')).toBeInTheDocument();
    expect(screen.getByText('Clique em "💾 Salvar" para salvar seu primeiro evento')).toBeInTheDocument();
  });
  test('renderiza todos os eventos fornecidos', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    expect(screen.getByText('Churrasco Corporativo')).toBeInTheDocument();
    expect(screen.getByText('Festa de Aniversário')).toBeInTheDocument();
  });
  test('ordena eventos por updatedAt (mais recente primeiro)', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    const eventNames = screen.getAllByRole('heading', {
      level: 3
    });
    // event-2 tem updatedAt mais recente (2025-10-11) que event-1 (2025-10-10)
    expect(eventNames[0]).toHaveTextContent('Festa de Aniversário');
    expect(eventNames[1]).toHaveTextContent('Churrasco Corporativo');
  });
  test('exibe data do evento formatada', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));

    // formatDate deve formatar '2025-12-25' como '25/12/2025'
    expect(screen.getByText(/25\/12\/2025/)).toBeInTheDocument();
  });
  test('exibe número de convidados', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    expect(screen.getByText('👥 100 pessoas')).toBeInTheDocument();
    expect(screen.getByText('👥 50 pessoas')).toBeInTheDocument();
  });
  test('exibe total formatado', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    expect(screen.getByText(/Total: R\$ 15\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/Total: R\$ 7\.500,00/)).toBeInTheDocument();
  });
  test('exibe preço por pessoa formatado', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    expect(screen.getAllByText(/Por pessoa: R\$ 150,00/)).toHaveLength(2);
  });
  test('destaca evento atual com badge', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    expect(screen.getByText('✓ Evento Atual')).toBeInTheDocument();
  });
  test('aplica classes CSS especiais ao evento atual', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    const eventCards = container.querySelectorAll('.border-orange-500');
    expect(eventCards.length).toBe(1); // Apenas o evento atual
  });
  test('não exibe badge quando nenhum evento está carregado', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, _extends({}, defaultProps, {
      currentEventId: null
    })));
    expect(screen.queryByText('✓ Evento Atual')).not.toBeInTheDocument();
  });
  test('renderiza 3 botões de ação para cada evento', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));

    // 2 eventos × 3 botões cada = 6 botões de ação
    expect(screen.getAllByText('📂 Abrir')).toHaveLength(2);
    expect(screen.getAllByText('📋 Copiar')).toHaveLength(2);
    expect(screen.getAllByText('🗑️ Excluir')).toHaveLength(2);
  });
  test('chama onLoadEvent ao clicar em Abrir', async () => {
    const user = userEvent.setup();
    const mockOnLoad = vi.fn();
    render(/*#__PURE__*/React.createElement(SavedEventsList, _extends({}, defaultProps, {
      onLoadEvent: mockOnLoad
    })));
    const openButtons = screen.getAllByText('📂 Abrir');
    await user.click(openButtons[0]);
    expect(mockOnLoad).toHaveBeenCalledWith('event-2'); // Primeiro na lista (mais recente)
  });
  test('chama onDuplicateEvent ao clicar em Copiar', async () => {
    const user = userEvent.setup();
    const mockOnDuplicate = vi.fn();
    render(/*#__PURE__*/React.createElement(SavedEventsList, _extends({}, defaultProps, {
      onDuplicateEvent: mockOnDuplicate
    })));
    const copyButtons = screen.getAllByText('📋 Copiar');
    await user.click(copyButtons[1]);
    expect(mockOnDuplicate).toHaveBeenCalledWith('event-1');
  });
  test('chama onDeleteEvent ao clicar em Excluir', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();
    render(/*#__PURE__*/React.createElement(SavedEventsList, _extends({}, defaultProps, {
      onDeleteEvent: mockOnDelete
    })));
    const deleteButtons = screen.getAllByText('🗑️ Excluir');
    await user.click(deleteButtons[0]);
    expect(mockOnDelete).toHaveBeenCalledWith('event-2', 'Festa de Aniversário');
  });
  test('chama onExportEvents ao clicar em Exportar Backup', async () => {
    const user = userEvent.setup();
    const mockOnExport = vi.fn();
    render(/*#__PURE__*/React.createElement(SavedEventsList, _extends({}, defaultProps, {
      onExportEvents: mockOnExport
    })));
    const exportButton = screen.getByText('💾 Exportar Backup');
    await user.click(exportButton);
    expect(mockOnExport).toHaveBeenCalled();
  });
  test('chama onClose ao clicar em Fechar no footer', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    render(/*#__PURE__*/React.createElement(SavedEventsList, _extends({}, defaultProps, {
      onClose: mockOnClose
    })));
    const closeButton = screen.getByText('Fechar');
    await user.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });
  test('chama onClose ao clicar no × do header', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    render(/*#__PURE__*/React.createElement(SavedEventsList, _extends({}, defaultProps, {
      onClose: mockOnClose
    })));
    const closeButtons = screen.getAllByText('×');
    await user.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });
  test('renderiza modal com overlay escuro', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    const overlay = container.querySelector('.bg-black.bg-opacity-50');
    expect(overlay).toBeInTheDocument();
  });
  test('renderiza evento sem eventDate corretamente', () => {
    const eventsWithoutDate = [{
      ...mockEvents[0],
      eventDate: null
    }];
    render(/*#__PURE__*/React.createElement(SavedEventsList, _extends({}, defaultProps, {
      savedEvents: eventsWithoutDate
    })));
    expect(screen.getByText('Churrasco Corporativo')).toBeInTheDocument();
    expect(screen.queryByText('📅')).not.toBeInTheDocument();
  });
  test('usa valores padrão quando props não são fornecidas', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, {
      onClose: vi.fn()
    }));
    expect(screen.getByText('Nenhum evento salvo ainda')).toBeInTheDocument();
  });
  test('aplica hover styles nos cards de eventos', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    const eventCards = container.querySelectorAll('.hover\\:border-gray-300');
    expect(eventCards.length).toBeGreaterThan(0);
  });
  test('mantém layout responsivo com max-w-4xl', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    const modal = container.querySelector('.max-w-4xl');
    expect(modal).toBeInTheDocument();
  });
  test('renderiza eventos com dados completos', () => {
    render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));

    // Verifica que todos os elementos estão presentes para cada evento
    mockEvents.forEach(event => {
      expect(screen.getByText(event.name)).toBeInTheDocument();
      expect(screen.getByText(`👥 ${event.data.guests} pessoas`)).toBeInTheDocument();
    });
  });
  test('botões têm estilos de hover corretos', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(SavedEventsList, defaultProps));
    expect(container.querySelector('.hover\\:bg-blue-700')).toBeInTheDocument();
    expect(container.querySelector('.hover\\:bg-purple-700')).toBeInTheDocument();
    expect(container.querySelector('.hover\\:bg-red-700')).toBeInTheDocument();
    expect(container.querySelector('.hover\\:bg-gray-700')).toBeInTheDocument();
    expect(container.querySelector('.hover\\:bg-orange-700')).toBeInTheDocument();
  });
});

// Expor ao window para uso com Babel
window.SavedEventsList.test = SavedEventsList.test;