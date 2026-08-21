// Códigos de error de Firebase Auth traducidos a algo que la persona entienda.
// Lo usan el login y el cambio de contraseña del perfil.
export function authErrorMsg(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Este correo ya está registrado.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Intenta más tarde.";
    case "auth/user-disabled":
      return "Esta cuenta ha sido deshabilitada.";
    case "auth/network-request-failed":
      return "Error de conexión. Revisa tu internet.";
    // Cambiar la contraseña exige haber iniciado sesión hace poco.
    case "auth/requires-recent-login":
      return "Por seguridad, vuelve a iniciar sesión antes de cambiar la contraseña.";
    default:
      return "Ocurrió un error. Intenta de nuevo.";
  }
}
