import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-[80vh] p-8">
        <div className="max-w-4xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              What A Match
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find your perfect match and connect with people who share your interests. 
              Build meaningful relationships in a vibrant community.
            </p>
          </div>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" asChild>
              <a href="/dashboard">Get Started</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Connect</CardTitle>
              <CardDescription>
                Find people who share your interests and values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our advanced matching algorithm helps you discover meaningful connections.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engage</CardTitle>
              <CardDescription>
                Build authentic relationships through conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Chat, share experiences, and grow together in a supportive community.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thrive</CardTitle>
              <CardDescription>
                Create lasting memories with your matches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                From friendships to partnerships, discover connections that matter.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
