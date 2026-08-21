"use client";

import { useActionState } from "react";
import { signInWithMagicLink, type MagicLinkState } from "./actions";

const initialState: MagicLinkState = {};

export default function ProfesorLoginPage() {
  const [state, action, pending] = useActionState(
    signInWithMagicLink,
    initialState
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Acceso docente
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Ingresá tu email y te enviamos un link para entrar, sin contraseña.
        </p>

        {state?.sent ? (
          <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
            Revisá tu email y hacé click en el link para ingresar.
          </p>
        ) : (
          <form action={action} className="space-y-3">
            <input
              type="email"
              name="email"
              required
              placeholder="tu@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
            />
            {state?.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Enviar link de acceso"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
