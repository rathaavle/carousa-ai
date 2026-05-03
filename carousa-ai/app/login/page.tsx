import LoginForm from "./LoginForm";

export const metadata = {
  title: "Masuk — Carousa-AI",
  description: "Masuk atau daftar ke Carousa-AI",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Carousa-AI
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Produksi konten carousel Instagram dengan AI
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
