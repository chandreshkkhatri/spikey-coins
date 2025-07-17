import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
  Lightbulb,
  Mic,
  ImageIcon,
  Globe,
  FileSearch,
  BarChart2,
  Wrench,
  Heart,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-white">
      <div className="w-full max-w-3xl mx-auto text-center">
        {/* Logo */}
        <h1 className="text-4xl font-normal mb-12 text-gray-900">perplexity</h1>

        {/* Search Input */}
        <div className="relative mb-8">
          <div className="relative">
            <Input
              className="pl-12 pr-32 py-6 text-lg rounded-xl border border-gray-200 shadow-sm focus:border-gray-300 focus:ring-0"
              placeholder="Ask anything or @mention a Space"
            />
            <div className="absolute inset-y-0 left-4 flex items-center">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <div className="absolute inset-y-0 right-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-8 w-8 p-0 hover:bg-gray-100"
              >
                <Globe className="h-4 w-4 text-gray-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-8 w-8 p-0 hover:bg-gray-100"
              >
                <ImageIcon className="h-4 w-4 text-gray-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-8 w-8 p-0 hover:bg-gray-100"
              >
                <Mic className="h-4 w-4 text-gray-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-8 w-8 p-0 bg-teal-500 hover:bg-teal-600 text-white"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4 gap-2 border-gray-200 hover:bg-gray-50 bg-transparent"
          >
            <Wrench className="h-4 w-4" />
            Troubleshoot
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4 gap-2 border-gray-200 hover:bg-gray-50 bg-transparent"
          >
            <Heart className="h-4 w-4" />
            Health
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4 gap-2 border-gray-200 hover:bg-gray-50 bg-transparent"
          >
            <Lightbulb className="h-4 w-4" />
            Learn
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4 gap-2 border-gray-200 hover:bg-gray-50 bg-transparent"
          >
            <FileSearch className="h-4 w-4" />
            Fact Check
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4 gap-2 border-gray-200 hover:bg-gray-50 bg-transparent"
          >
            <BarChart2 className="h-4 w-4" />
            Analyze
          </Button>
        </div>
      </div>

      {/* Upgrade Banner */}
      <div className="fixed bottom-6 left-20 max-w-sm p-4 bg-white border border-gray-200 rounded-xl shadow-lg">
        <div className="mb-3">
          <h3 className="font-medium text-gray-900">Upgrade to Pro</h3>
          <p className="text-sm text-gray-600 mt-1">
            Unlock deeper insights with our most powerful search capabilities
            and AI models.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-gray-900 hover:bg-gray-800">
            Upgrade
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-200 hover:bg-gray-50 bg-transparent"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
