"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";

/**
 * Sign in an existing user with email and password.
 * On success, redirects to /dashboard.
 * On failure, returns an error message string.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<string | undefined> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return "Email atau password tidak sesuai. Silakan coba lagi.";
  }

  redirect("/dashboard");
}

/**
 * Register a new user with email and password.
 * On success, redirects to /dashboard.
 * On failure, returns an error message string.
 */
export async function signUp(
  email: string,
  password: string,
): Promise<string | undefined> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.";
    }
    return "Gagal membuat akun. Silakan coba lagi.";
  }

  redirect("/dashboard");
}

/**
 * Sign out the current user and redirect to /login.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
