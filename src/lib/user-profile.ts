
export type UserRole =
  | 'ADMINISTRADOR'
  | 'VENDEDOR_DMR'
  | 'USUARIO'
  | 'CLIENTE_FINAL'
  | 'REVENDEDOR'
  | 'DISTRIBUIDOR';

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  status: 'activo' | 'inactivo';
};

    