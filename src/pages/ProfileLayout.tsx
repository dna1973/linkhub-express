import { Outlet } from 'react-router-dom';
import { CurrentProfileProvider } from '@/contexts/CurrentProfileContext';

// Rota de layout do painel (/dashboard e /analytics): as duas páginas usam o mesmo perfil atual.
// Arquivo próprio, carregado sob demanda: quem abre /:username não baixa o contexto do painel.
const ProfileLayout = () => (
  <CurrentProfileProvider>
    <Outlet />
  </CurrentProfileProvider>
);

export default ProfileLayout;
