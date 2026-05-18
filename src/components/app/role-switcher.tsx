"use client";

import { ArrowRight, Check, Eye, EyeOff, KeyRound, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
type LoginCredential = Pick<DemoCredential, "name" | "email" | "password" | "role"> & {
  label: string;
};

const signupRoles: Role[] = ["employee", "manager", "admin"];
const loginCredentials: LoginCredential[] = [
  ...demoCredentials.map((credential) => ({
    label: getRoleLabel(credential.role),
    name: credential.name,
    email: credential.email,
    password: credential.password,
    role: credential.role,
  })),
  {
    label: "Employee 1",
    name: "Employee1",
    email: "employee1@gmail.com",
    password: "password",
    role: "employee",
  },
  {
    label: "Employee 2",
    name: "Employee2",
    email: "employee2@gmail.com",
    password: "password",
    role: "employee",
  },
  {
    label: "Employee 3",
    name: "Employee3",
    email: "employee3@gmail.com",
    password: "password",
    role: "employee",
  },
];

export function RoleSwitcher() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [selectedCredential, setSelectedCredential] = useState<LoginCredential>(loginCredentials[0]);
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
  const isSelectedCredentialFilled =
    loginEmail === selectedCredential.email && loginPassword === selectedCredential.password;

  function selectCredential(credential: LoginCredential) {
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
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">AtomQuest</h1>
            <p className="text-sm text-muted-foreground">Goal setting, check-ins, and review workflows</p>
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xl space-y-5">
            <div className="space-y-2 text-center">
              <Badge variant="secondary" className="mx-auto">
                Demo ready
              </Badge>
              <h2 className="text-3xl font-semibold tracking-normal">Sign in to AtomQuest</h2>
              <p className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground">
                Pre-defined demo accounts are already available. Click any account below to fill the
                email and password automatically, then sign in.
              </p>
            </div>

            <Card className="mx-auto w-full max-w-md">
              <CardHeader>
                <div className="grid rounded-lg border border-border bg-muted/40 p-1 md:grid-cols-2">
                  <Button
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    type="button"
                    variant={mode === "login" ? "default" : "ghost"}
                  >
                    <KeyRound className="size-4" />
                    Sign in
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
                <CardTitle>{mode === "login" ? "Account credentials" : "Create demo account"}</CardTitle>
                <CardDescription>
                  {mode === "login"
                    ? "Use a demo shortcut or enter credentials manually."
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
                          {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                    </div>
                    <FormError message={error} title="Sign in failed" />
                    <Button className="w-full justify-between" disabled={isSubmitting} type="submit">
                      {isSubmitting
                        ? "Signing in"
                        : isSelectedCredentialFilled
                          ? `Continue as ${getRoleLabel(selectedCredential.role)}`
                          : "Sign in"}
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
                          {showSignupPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                    </div>
                    <FormError message={error} title="Signup failed" />
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <div className="grid gap-2 sm:grid-cols-3">
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
                            {selectedSignupRole === role ? <Check className="size-4" /> : null}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full justify-between" disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Creating account" : `Create ${getRoleLabel(selectedSignupRole)} account`}
                      <ArrowRight className="size-4" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {mode === "login" ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {loginCredentials.map((credential) => {
                  const isSelected =
                    credential.email === selectedCredential.email && isSelectedCredentialFilled;

                  return (
                    <button
                      className={`rounded-lg border px-3 py-3 text-left transition hover:border-primary/70 hover:bg-muted/50 ${
                        isSelected ? "border-primary bg-primary/10" : "border-border bg-card"
                      }`}
                      key={credential.email}
                      onClick={() => selectCredential(credential)}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">{credential.label}</span>
                        {isSelected ? <Check className="size-4 text-primary" /> : null}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">{credential.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {credential.email}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
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
