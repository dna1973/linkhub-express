import { Navigate, Outlet } from 'react-router-dom';
import { CurrentProfileProvider } from '@/contexts/CurrentProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { NEW_PASSWORD_PATH, getRecoveryUserId } from '@/lib/passwordRecovery';

// Rota de layout do painel (/dashboard e /analytics): as duas páginas usam o mesmo perfil atual.
// Arquivo próprio, carregado sob demanda: quem abre /:username não baixa o contexto do painel.
const ProfileLayout = () => {
  const { user } = useAuth();
  // Sessão aberta pelo link de recuperação de senha: o painel criaria o primeiro perfil para ela
  if (user && getRecoveryUserId() === user.id) return <Navigate to={NEW_PASSWORD_PATH} replace />;
  return (
    <CurrentProfileProvider>
      <Outlet />
    </CurrentProfileProvider>
  );
};

export default ProfileLayout;
