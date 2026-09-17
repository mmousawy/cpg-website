export function isOnboardingPath(pathname: string) {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/');
}
