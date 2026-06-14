"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useRegister } from "@/components/auth/use-register";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
  const { submit, isSubmitting, fieldErrors, formError } = useRegister();
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submit({ orgName, name, email, password, confirmPassword });
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Create your account"
        description="Start discovering and enriching B2B leads for your organization."
        footer={
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
              Sign in
            </Link>
          </>
        }
      >
        {formError ? (
          <div className="mb-4">
            <Alert variant="error">{formError}</Alert>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="orgName"
            label="Organization name"
            autoComplete="organization"
            required
            value={orgName}
            error={fieldErrors.orgName}
            onChange={(event) => setOrgName(event.target.value)}
          />
          <Input
            id="name"
            label="Your name"
            autoComplete="name"
            required
            value={name}
            error={fieldErrors.name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            error={fieldErrors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            error={fieldErrors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            id="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            error={fieldErrors.confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
