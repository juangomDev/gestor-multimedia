import type { Role, User } from '../../types/auth';

/**
 * Cuentas de servicio del sistema protegidas contra suspensión, reseteo o borrado.
 */
export const PROTECTED_SYSTEM_USERNAMES = ['ai_manager'] as const;

/**
 * Resultado de validación para ejecutar mutaciones RBAC sobre un usuario.
 */
export interface UserMutationGuard {
  allowed: boolean;
  reason: string | null;
}

/**
 * Indica si un usuario corresponde a una cuenta de servicio interna del sistema (ej. `ai_manager`).
 */
export function isProtectedSystemUser(user: Pick<User, 'username'>): boolean {
  return PROTECTED_SYSTEM_USERNAMES.includes(
    user.username.trim().toLowerCase() as (typeof PROTECTED_SYSTEM_USERNAMES)[number]
  );
}

/**
 * Devuelve los roles que el usuario autenticado puede asignar al crear una nueva cuenta:
 * - `ADMIN`: `COLLABORATOR` y `MANAGER`
 * - `MANAGER`: únicamente `COLLABORATOR`
 */
export function getCreatableRoles(actorRole: Role | undefined): Role[] {
  if (actorRole === 'ADMIN') return ['COLLABORATOR', 'MANAGER'];
  if (actorRole === 'MANAGER') return ['COLLABORATOR'];
  return [];
}

/**
 * Evalúa si el usuario actual puede mutar (suspender, resetear clave o eliminar) a `target`.
 * Protege siempre cuentas de sistema (`ai_manager`), auto-modificación y jerarquía RBAC.
 */
export function canMutateUser(
  target: User,
  actor: { id: string; role: Role } | null | undefined
): UserMutationGuard {
  if (!actor) {
    return { allowed: false, reason: 'Sesión no disponible.' };
  }
  if (target.id === actor.id) {
    return { allowed: false, reason: 'No puedes modificar ni eliminar tu propia cuenta.' };
  }
  if (isProtectedSystemUser(target)) {
    return {
      allowed: false,
      reason: 'Cuenta de servicio del sistema protegida (Widget de Chat Público).',
    };
  }
  if (actor.role === 'MANAGER' && target.role !== 'COLLABORATOR') {
    return {
      allowed: false,
      reason: 'Un gestor de equipo solo puede administrar cuentas de colaboradores.',
    };
  }
  if (actor.role === 'COLLABORATOR') {
    return { allowed: false, reason: 'Permisos insuficientes.' };
  }
  return { allowed: true, reason: null };
}

/**
 * Genera una contraseña temporal segura de 12 caracteres lista para copiar y entregar al colaborador.
 */
export function generateTemporaryPassword(length: number = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * alphabet.length);
    }
  }
  return Array.from(bytes, (val) => alphabet[val % alphabet.length]).join('');
}
