import { render, screen } from '@testing-library/react';
import { AuthProviderInfo } from '../dashboard/AuthProviderInfo';
import { useAuth } from '@/contexts/AuthContext';

// Mock do contexto de autenticação
jest.mock('@/contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AuthProviderInfo', () => {
  it('shows Google provider info', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '123',
        app_metadata: { providers: ['google'] },
        email: 'test@gmail.com'
      } as any,
      session: null,
      loading: false,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signInWithProvider: jest.fn(),
      signOut: jest.fn(),
    });

    render(<AuthProviderInfo />);
    expect(screen.getByText('Conectado via Google')).toBeInTheDocument();
  });

  it('shows GitHub provider info', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '123',
        app_metadata: { providers: ['github'] },
        email: 'test@github.com'
      } as any,
      session: null,
      loading: false,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signInWithProvider: jest.fn(),
      signOut: jest.fn(),
    });

    render(<AuthProviderInfo />);
    expect(screen.getByText('Conectado via GitHub')).toBeInTheDocument();
  });

  it('shows Email provider info for regular login', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '123',
        app_metadata: { providers: ['email'] },
        email: 'test@example.com'
      } as any,
      session: null,
      loading: false,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signInWithProvider: jest.fn(),
      signOut: jest.fn(),
    });

    render(<AuthProviderInfo />);
    expect(screen.getByText('Conectado via Email')).toBeInTheDocument();
  });

  it('does not render when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signInWithProvider: jest.fn(),
      signOut: jest.fn(),
    });

    const { container } = render(<AuthProviderInfo />);
    expect(container.firstChild).toBeNull();
  });
});