import { COGNITO_CONFIG } from './cognito-config.js';

// aws-amplify is loaded globally in index.html as `aws_amplify`
const { Amplify, Auth } = window.aws_amplify || {};

if (Amplify && Auth) {
  Amplify.configure(COGNITO_CONFIG);
}

export async function signIn() {
  if (Auth) return Auth.federatedSignIn();
  throw new Error('Amplify not loaded');
}

export async function signOut() {
  if (Auth) return Auth.signOut();
  throw new Error('Amplify not loaded');
}

export async function getCurrentUser() {
  if (!Auth) return null;
  try {
    return await Auth.currentAuthenticatedUser();
  } catch {
    return null;
  }
}
