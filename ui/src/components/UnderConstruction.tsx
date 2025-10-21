"use client";

import React from "react";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UnderConstructionProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

export default function UnderConstruction({
  title = "Under Construction",
  description = "This feature is currently being developed and will be available soon.",
  showBackButton = true,
}: UnderConstructionProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md px-4">
        <div className="mb-6">
          <Construction className="h-16 w-16 text-yellow-500 mx-auto animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          {title}
        </h1>
        
        <p className="text-gray-600 mb-8">
          {description}
        </p>
        
        {showBackButton && (
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}