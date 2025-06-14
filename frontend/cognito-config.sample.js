export const COGNITO_CONFIG = {
  Auth: {
    region: "YOUR_REGION",
    userPoolId: "YOUR_USER_POOL_ID",
    userPoolWebClientId: "YOUR_USER_POOL_CLIENT_ID",
    oauth: {
      domain: "your-domain.auth.region.amazoncognito.com",
      scope: ["openid", "email"],
      redirectSignIn: window.location.origin,
      redirectSignOut: window.location.origin,
      responseType: "code"
    }
  }
};
