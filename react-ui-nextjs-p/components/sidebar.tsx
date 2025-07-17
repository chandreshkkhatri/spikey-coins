"use client";

import type React from "react";

import Link from "next/link";
import {
  Home,
  Globe,
  LayoutGrid,
  User,
  ArrowUpRight,
  Download,
  Plus,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  return (
    <div className="w-16 h-full border-r border-gray-200 bg-gray-50 flex flex-col items-center py-4">
      <div className="flex flex-col items-center gap-6 h-full">
        {/* Logo */}
        <Link href="/" className="mb-4">
          <div className="w-8 h-8 text-gray-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </Link>

        {/* New button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-gray-200"
        >
          <Plus className="h-5 w-5 text-gray-600" />
        </Button>

        {/* Navigation */}
        <div className="flex flex-col items-center gap-4 mt-4">
          <NavItem
            href="/"
            icon={<Home className="h-5 w-5" />}
            label="Home"
            active
          />
          <NavItem
            href="/discover"
            icon={<Globe className="h-5 w-5" />}
            label="Discover"
          />
          <NavItem
            href="/spaces"
            icon={<LayoutGrid className="h-5 w-5" />}
            label="Spaces"
          />
        </div>

        {/* Bottom items */}
        <div className="mt-auto flex flex-col items-center gap-4">
          <NavItem
            href="/account"
            icon={<User className="h-5 w-5" />}
            label="Account"
          />
          <NavItem
            href="/upgrade"
            icon={<ArrowUpRight className="h-5 w-5" />}
            label="Upgrade"
          />
          <NavItem
            href="/install"
            icon={<Download className="h-5 w-5" />}
            label="Install"
          />
        </div>

        {/* Help */}
        <Button
          variant="ghost"
          size="icon"
          className="mt-4 rounded-full hover:bg-gray-200"
        >
          <HelpCircle className="h-5 w-5 text-gray-600" />
        </Button>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 group">
      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full hover:bg-gray-200 ${
          active ? "bg-gray-200" : ""
        }`}
      >
        <span className="text-gray-600">{icon}</span>
      </Button>
      <span className="text-xs text-gray-500 group-hover:text-gray-700">
        {label}
      </span>
    </Link>
  );
}
