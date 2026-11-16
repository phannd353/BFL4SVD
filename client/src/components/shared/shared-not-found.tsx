"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function GoBackButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full sm:w-auto"
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-4 w-4" />
      Go Back
    </Button>
  );
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-2xl shadow-2xl border-2">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="text-9xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text">
                404
              </div>
              <div className="absolute inset-0 blur-2xl opacity-20 bg-gradient-to-br from-primary to-primary/60" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-lg">
            Oops! The page you&apos;re looking for seems to have wandered off
            into the depths of history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <p>The resource you requested could not be found.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
          <Button variant="default" size="lg" className="w-full sm:w-auto">
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Return Home
            </Link>
          </Button>
          <GoBackButton />
        </CardFooter>
      </Card>
    </div>
  );
}
