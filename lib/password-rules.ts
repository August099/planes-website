// Reglas de contraseña compartidas por el registro, "Cambiar contraseña" y "Restablecer contraseña".
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export const PASSWORD_RULES_TEXT = "Mínimo 8 caracteres, con una mayúscula, un número y un símbolo.";
