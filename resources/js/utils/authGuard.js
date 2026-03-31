// resources/js/utils/authGuard.js
import { auth } from './auth'

export const clearAuthData = () => auth.logout()
export const redirectIfAuthenticated = () => auth.isAuthenticated()
