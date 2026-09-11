import { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { signIn, signUp, sendPasswordReset, getAuthErrorMessage } from "../services/authService";

export function useAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const buttonLabel = isLoginMode ? "Iniciar sesión" : "Crear cuenta";

  const handleSubmit = useCallback(
    async (onAccountCreated: (user: User) => void) => {
      const normalizedEmail = email.trim();
      setAuthError(null);
      setAuthNotice(null);

      if (!normalizedEmail || !password) {
        setAuthError("Ingresa email y contraseña.");
        return;
      }

      if (!isLoginMode && password.length < 6) {
        setAuthError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }

      try {
        setSubmitting(true);
        if (isLoginMode) {
          const user = await signIn(normalizedEmail, password);
          onAccountCreated(user);
        } else {
          const user = await signUp(normalizedEmail, password);
          onAccountCreated(user);
        }
      } catch (error) {
        setAuthError(getAuthErrorMessage(error));
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, isLoginMode]
  );

  const handlePasswordReset = useCallback(async () => {
    const normalizedEmail = email.trim();
    setAuthError(null);
    setAuthNotice(null);

    if (!normalizedEmail) {
      setAuthError("Escribe tu correo para recuperar la contraseña.");
      return;
    }

    try {
      await sendPasswordReset(normalizedEmail);
      setAuthNotice("Te enviamos un enlace para cambiar la contraseña.");
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    }
  }, [email]);

  const toggleMode = useCallback(() => {
    setIsLoginMode((prev) => !prev);
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoginMode,
    submitting,
    authError,
    authNotice,
    buttonLabel,
    handleSubmit,
    handlePasswordReset,
    toggleMode,
  };
}