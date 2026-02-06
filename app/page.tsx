export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold">What A Match</h1>
        <p className="text-lg text-muted-foreground">
          Find your perfect match and connect with people who share your interests.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/auth/signup"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            Get Started
          </a>
          <a
            href="/auth/login"
            className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition"
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
