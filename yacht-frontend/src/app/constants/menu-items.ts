export const MENU_ITEMS = {
  admin: [
    { name: 'Dashboard', route: '/dashboard/admin', icon: 'fas fa-chart-line' },
    { name: 'Gestion des utilisateurs', route: '/dashboard/admin/users', icon: 'fas fa-users' },
    { name: 'Gestion des Yachts', route: '/dashboard/admin/yachts', icon: 'fas fa-ship' },
    { name: 'Gestion des Reviews', route: '/dashboard/admin/reviews', icon: 'fas fa-star' },
    { name: 'Paramètres', route: '/dashboard/admin/settings', icon: 'fas fa-cog' },
  ],
  owner: [
    { name: 'Mes Yachts', route: '/dashboard/owner/list', icon: 'fas fa-ship' },
    { name: 'Mon Agenda', route: '/dashboard/owner/bookings', icon: 'fas fa-calendar-alt' },
    { name: 'Mes Revenus', route: '/dashboard/owner/earnings', icon: 'fas fa-dollar-sign' },
    { name: 'Ajouter un Yacht', route: '/dashboard/owner/yacht/add', icon: 'fas fa-plus-circle' },
    { name: 'Paramètres', route: '/dashboard/owner/settings', icon: 'fas fa-cog' },
  ],
  client: [
    { name: 'Liste yachts Disponible', route: '/dashboard/client/list', icon: 'fas fa-anchor' },
    { name: 'Mes réservations', route: '/dashboard/client/bookings', icon: 'fas fa-calendar-check' },
    { name: 'Recommandations IA', route: '/dashboard/client/ai-recommendations', icon: 'fas fa-robot' },
    { name: 'Mes payments', route: '/dashboard/client/payments', icon: 'fas fa-credit-card' },
    { name: 'Paramètres', route: '/dashboard/client/settings', icon: 'fas fa-cog' },
  ],
};
