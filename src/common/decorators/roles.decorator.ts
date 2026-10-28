import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/models/user.entity.js';

export const ROLES_KEY = 'roles';

/**
 * Decorator to assign required roles to endpoints or controllers.
 * Example: @Roles('admin')
 */
export const Roles = (...roles: (UserRole | string)[]) =>
  SetMetadata(ROLES_KEY, roles);
