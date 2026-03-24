import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <SignIn />
      <a
        href="https://www.intelliforge.tech/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
      >
        Powered by <span className="font-medium">IntelliForge AI</span>
      </a>
    </div>
  );
}
