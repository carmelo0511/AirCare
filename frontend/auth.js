import { COGNITO_CONFIG } from './cognito-config.js';

// aws-amplify is loaded globally in index.html as `aws_amplify`.
// It might not be available immediately when this module executes,
// so we fetch it lazily whenever a method is called.

let configured = false;

function getAuth() {
  const { Amplify, Auth } = window.aws_amplify || {};
  if (Amplify && Auth && !configured) {
    Amplify.configure(COGNITO_CONFIG);
    configured = true;
  }
  return Auth;
}

export async function signIn() {
  const Auth = getAuth();
  if (Auth) return Auth.federatedSignIn();
  throw new Error('Amplify not loaded');
}

export async function signOut() {
  const Auth = getAuth();
  if (Auth) return Auth.signOut();
  throw new Error('Amplify not loaded');
}

export async function getCurrentUser() {
  const Auth = getAuth();
  if (!Auth) return null;
  try {
    return await Auth.currentAuthenticatedUser();
  } catch {
    return null;
  }
}
