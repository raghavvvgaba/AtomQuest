"use client";

import { ArrowRight, Eye, EyeOff, KeyRound, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { demoCredentials, getHomePathForRole, type DemoCredential } from "@/lib/auth/demo-users";
import { getRoleLabel } from "@/lib/goal-sheet";
import type { Role } from "@/lib/types";

type AuthMode = "login" | "signup";

const signupRoles: Role[] = ["employee", "manager", "admin"];

export function RoleSwitcher() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [selectedCredential, setSelectedCredential] = useState(demoCredentials[0]);
  const [selectedSignupRole, setSelectedSignupRole] = useState<Role>("employee");
  const [loginEmail, setLoginEmail] = useState(selectedCredential.email);
  const [loginPassword, setLoginPassword] = useState(selectedCredential.password);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function selectCredential(credential: DemoCredential) {
    setSelectedCredential(credential);
    setLoginEmail(credential.email);
    setLoginPassword(credential.password);
    setError(null);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email: loginEmail,
      password: loginPassword,
    });

    if (signInError) {
      setError(signInError.message || "Could not sign in with those credentials.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error: signUpError } = await authClient.signUp.email({
      email: signupEmail,
      password: signupPassword,
      name: signupName,
    });

    if (signUpError) {
      setError(signUpError.message || "Could not create the account.");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/auth/app-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: selectedSignupRole }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "Account was created, but role setup failed.");
      setIsSubmitting(false);
      return;
    }

    router.replace(getHomePathForRole(selectedSignupRole));
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 md:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">AtomQuest</h1>
            <p className="text-sm text-muted-foreground">Sign in or create a demo account</p>
          </div>
          <ThemeToggle />
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <div className="grid rounded-xl border border-border bg-card p-1 md:grid-cols-2">
              <Button
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                type="button"
                variant={mode === "login" ? "default" : "ghost"}
              >
                <KeyRound className="size-4" />
                Demo login
              </Button>
              <Button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                type="button"
                variant={mode === "signup" ? "default" : "ghost"}
              >
                <UserPlus className="size-4" />
                Create account
              </Button>
            </div>

            {mode === "login" ? (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
                {demoCredentials.map((credential) => {
                  const isSelected = credential.email === selectedCredential.email;

                  return (
                    <Card
                      key={credential.email}
                      className={isSelected ? "border-primary" : undefined}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle>{getRoleLabel(credential.role)}</CardTitle>
                          {isSelected ? <Badge>Selected</Badge> : null}
                        </div>
                        <CardDescription>{credential.name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          className="w-full justify-between"
                          onClick={() => selectCredential(credential)}
                          type="button"
                          variant={isSelected ? "default" : "secondary"}
                        >
                          Use {getRoleLabel(credential.role)}
                          <ArrowRight className="size-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Choose account type</CardTitle>
                  <CardDescription>
                    Demo signup lets you pick a role for hackathon testing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
                  {signupRoles.map((role) => (
                    <Button
                      className="justify-between"
                      key={role}
                      onClick={() => {
                        setSelectedSignupRole(role);
                        setError(null);
                      }}
                      type="button"
                      variant={selectedSignupRole === role ? "default" : "secondary"}
                    >
                      {getRoleLabel(role)}
                      {selectedSignupRole === role ? <Badge variant="secondary">Selected</Badge> : null}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                {mode === "login" ? <KeyRound className="size-5" /> : <UserPlus className="size-5" />}
              </div>
              <CardTitle>{mode === "login" ? "Demo login" : "Create demo account"}</CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Use a seeded account or enter credentials manually."
                  : "This is demo-mode signup. Users can choose their role for hackathon testing."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "login" ? (
                <form className="space-y-4" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      autoComplete="email"
                      id="login-email"
                      onChange={(event) => setLoginEmail(event.target.value)}
                      type="email"
                      value={loginEmail}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        autoComplete="current-password"
                        className="pr-11"
                        id="login-password"
                        onChange={(event) => setLoginPassword(event.target.value)}
                        type={showLoginPassword ? "text" : "password"}
                        value={loginPassword}
                      />
                      <Button
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                        className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                        onClick={() => setShowLoginPassword((value) => !value)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <FormError message={error} title="Sign in failed" />
                  <Button className="w-full justify-between" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Signing in" : `Continue as ${getRoleLabel(selectedCredential.role)}`}
                    <ArrowRight className="size-4" />
                  </Button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleSignup}>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full name</Label>
                    <Input
                      autoComplete="name"
                      id="signup-name"
                      onChange={(event) => setSignupName(event.target.value)}
                      placeholder="Enter your full name"
                      required
                      type="text"
                      value={signupName}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      autoComplete="email"
                      id="signup-email"
                      onChange={(event) => setSignupEmail(event.target.value)}
                      placeholder="Enter your email"
                      required
                      type="email"
                      value={signupEmail}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        autoComplete="new-password"
                        className="pr-11"
                        id="signup-password"
                        minLength={8}
                        onChange={(event) => setSignupPassword(event.target.value)}
                        placeholder="Create a password"
                        required
                        type={showSignupPassword ? "text" : "password"}
                        value={signupPassword}
                      />
                      <Button
                        aria-label={showSignupPassword ? "Hide password" : "Show password"}
                        className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                        onClick={() => setShowSignupPassword((value) => !value)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        {showSignupPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <FormError message={error} title="Signup failed" />
                  <Button className="w-full justify-between" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Creating account" : `Create ${getRoleLabel(selectedSignupRole)} account`}
                    <ArrowRight className="size-4" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function FormError({ message, title }: { message: string | null; title: string }) {
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
