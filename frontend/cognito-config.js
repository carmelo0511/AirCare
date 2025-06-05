export const COGNITO_CONFIG = {
  Auth: {
    region: "ca-central-1",
    userPoolId: "ca-central-1_Q5Ghtpp1y",
    userPoolWebClientId: "ceq2oj1a2ms76eb8hipkhlius",
    oauth: {
      domain: "ca-central-1q5ghtpp1y.auth.ca-central-1.amazoncognito.com",
      scope: ["openid", "email"],
      redirectSignIn: window.location.origin,
      redirectSignOut: window.location.origin,
      responseType: "code"
    }
  }
};
