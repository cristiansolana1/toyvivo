import { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { signIn, signUp, sendPasswordReset, getAuthErrorMessage } from "../services/authService";

interface UseAuthReturn {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isLoginMode: boolean;
  setIsLoginMode: (isLoginMode: boolean) => void;
  submitting: boolean;
  authError: string | null;
  authNotice: string | null;
  buttonLabel: string;
  handleSubmit: (onAccountCreated: (user: User) => void) => Promise<void>;
  handlePasswordReset: () => Promise<void>;
  toggleMode: () => void;
}

export function useAuth(): UseAuthReturn {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const buttonLabel = isLoginMode ? "Iniciar sesión" : "Crear cuenta";

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    setAuthError(null);
    setAuthNotice(null);
  }, []);

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
    setEmail: handleEmailChange,
    password,
    setPassword: handlePasswordChange,
    isLoginMode,
    setIsLoginMode,
    submitting,
    authError,
    authNotice,
    buttonLabel,
    handleSubmit,
    handlePasswordReset,
    toggleMode,
  };
}
