export const COGNITO_CONFIG = {
  Auth: {
    region: "",
    userPoolId: "",
    userPoolWebClientId: "",
    oauth: {
      domain: "",
      scope: ["openid", "email"],
      redirectSignIn: window.location.origin,
      redirectSignOut: window.location.origin,
      responseType: "code"
    }
  }
};
