import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { PasswordLock } from './PasswordLock.jsx';
describe('PasswordLock', () => {
  let originalDate;
  beforeEach(() => {
    // Salva Date original
    originalDate = global.Date;
    // Mocka Date para 2025-10-11 12:00:00
    global.Date = class extends originalDate {
      constructor(...args) {
        if (args.length === 0) {
          super('2025-10-11T12:00:00Z');
        } else {
          super(...args);
        }
      }
      static now() {
        return new originalDate('2025-10-11T12:00:00Z').getTime();
      }
    };
  });
  afterEach(() => {
    // Restaura Date original
    global.Date = originalDate;
  });
  test('não renderiza nada quando não há bloqueio nem tentativas', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: false,
      passwordAttempts: 0
    }));
    expect(container.firstChild).toBeNull();
  });
  test('renderiza aviso de bloqueio quando isLocked=true', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    expect(screen.getByText(/App Bloqueado por/)).toBeInTheDocument();
  });
  test('calcula minutos restantes corretamente', () => {
    // Bloqueio iniciado há 5 minutos (15 - 5 = 10 minutos restantes)
    const lockoutTime = new Date('2025-10-11T11:55:00Z');
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    expect(screen.getByText('🔒 App Bloqueado por 10 min')).toBeInTheDocument();
  });
  test('calcula minutos restantes com arredondamento para cima', () => {
    // Bloqueio iniciado há 5.5 minutos (15 - 5.5 = 9.5 -> ceil = 10)
    const lockoutTime = new Date('2025-10-11T11:54:30Z');
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    expect(screen.getByText('🔒 App Bloqueado por 10 min')).toBeInTheDocument();
  });
  test('mostra 15 minutos quando bloqueio acabou de ocorrer', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    expect(screen.getByText('🔒 App Bloqueado por 15 min')).toBeInTheDocument();
  });
  test('renderiza com estilo vermelho quando bloqueado', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    const alert = container.querySelector('.bg-red-100.border-red-300.text-red-800');
    expect(alert).toBeInTheDocument();
  });
  test('renderiza aviso de tentativas quando passwordAttempts > 0', () => {
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: false,
      passwordAttempts: 1
    }));
    expect(screen.getByText('⚠️ 2 tentativa(s) restante(s)')).toBeInTheDocument();
  });
  test('mostra 2 tentativas restantes com 1 tentativa falha', () => {
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: false,
      passwordAttempts: 1
    }));
    expect(screen.getByText(/2 tentativa\(s\) restante\(s\)/)).toBeInTheDocument();
  });
  test('mostra 1 tentativa restante com 2 tentativas falhas', () => {
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: false,
      passwordAttempts: 2
    }));
    expect(screen.getByText(/1 tentativa\(s\) restante\(s\)/)).toBeInTheDocument();
  });
  test('renderiza com estilo laranja quando há tentativas', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: false,
      passwordAttempts: 1
    }));
    const alert = container.querySelector('.bg-orange-100.border-orange-300.text-orange-800');
    expect(alert).toBeInTheDocument();
  });
  test('não renderiza aviso de tentativas quando bloqueado', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime,
      passwordAttempts: 2
    }));

    // Deve mostrar apenas o aviso de bloqueio, não o de tentativas
    expect(screen.getByText(/App Bloqueado/)).toBeInTheDocument();
    expect(screen.queryByText(/tentativa\(s\) restante\(s\)/)).not.toBeInTheDocument();
  });
  test('não renderiza quando isLocked=true mas lockoutTime=null', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: null
    }));
    expect(container.firstChild).toBeNull();
  });
  test('não renderiza quando passwordAttempts=0 e não está bloqueado', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: false,
      passwordAttempts: 0
    }));
    expect(container.firstChild).toBeNull();
  });
  test('usa valores padrão quando props não são fornecidas', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, null));
    expect(container.firstChild).toBeNull();
  });
  test('emoji 🔒 está presente no aviso de bloqueio', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    expect(screen.getByText(/🔒/)).toBeInTheDocument();
  });
  test('emoji ⚠️ está presente no aviso de tentativas', () => {
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: false,
      passwordAttempts: 1
    }));
    expect(screen.getByText(/⚠️/)).toBeInTheDocument();
  });
  test('aviso de bloqueio tem classes de centralização', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    const alert = container.querySelector('.text-center');
    expect(alert).toBeInTheDocument();
  });
  test('aviso de tentativas tem classes de centralização', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: false,
      passwordAttempts: 1
    }));
    const alert = container.querySelector('.text-center');
    expect(alert).toBeInTheDocument();
  });
  test('aviso de bloqueio tem tamanho de fonte text-sm', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    const alert = container.querySelector('.text-sm');
    expect(alert).toBeInTheDocument();
  });
  test('aviso de tentativas tem tamanho de fonte text-xs', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: false,
      passwordAttempts: 1
    }));
    const alert = container.querySelector('.text-xs');
    expect(alert).toBeInTheDocument();
  });
  test('aviso de bloqueio é semibold', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    const alert = container.querySelector('.font-semibold');
    expect(alert).toBeInTheDocument();
  });
  test('aviso tem width full (w-full)', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    const alert = container.querySelector('.w-full');
    expect(alert).toBeInTheDocument();
  });
  test('aviso tem padding (p-3)', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    const alert = container.querySelector('.p-3');
    expect(alert).toBeInTheDocument();
  });
  test('aviso tem bordas arredondadas (rounded-lg)', () => {
    const lockoutTime = new Date('2025-10-11T12:00:00Z');
    const {
      container
    } = render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    const alert = container.querySelector('.rounded-lg');
    expect(alert).toBeInTheDocument();
  });
  test('calcula corretamente quando falta 1 minuto', () => {
    // Bloqueio iniciado há 14 minutos (15 - 14 = 1 minuto restante)
    const lockoutTime = new Date('2025-10-11T11:46:00Z');
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: true,
      lockoutTime: lockoutTime
    }));
    expect(screen.getByText('🔒 App Bloqueado por 1 min')).toBeInTheDocument();
  });
  test('mostra 0 tentativas restantes com 3 tentativas falhas', () => {
    render(/*#__PURE__*/React.createElement(PasswordLock, {
      isLocked: false,
      passwordAttempts: 3
    }));
    expect(screen.getByText(/0 tentativa\(s\) restante\(s\)/)).toBeInTheDocument();
  });
});

// Expor ao window para uso com Babel
window.PasswordLock.test = PasswordLock.test;