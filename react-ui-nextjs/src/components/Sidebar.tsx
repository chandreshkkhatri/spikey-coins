"use client";

import type React from "react";
import Link from "next/link";
import {
  Home,
  BarChart2,
  TrendingUp,
  RefreshCw,
  Coins,
  Activity,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onRefreshTicker?: () => void;
  onRefreshMarketCap?: () => void;
  loading?: boolean;
  tickerCount?: number;
}

export default function Sidebar({
  onRefreshTicker,
  onRefreshMarketCap,
  loading = false,
  tickerCount = 0,
}: SidebarProps) {
  return (
    <div className="w-16 h-full border-r border-gray-200 bg-gray-50 flex flex-col items-center py-4">
      <div className="flex flex-col items-center gap-6 h-full">
        <Link href="/" className="mb-4">
          <div className="w-8 h-8 text-blue-600">
            <Coins className="h-8 w-8" />
          </div>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-gray-200"
          onClick={onRefreshTicker}
          disabled={loading}
          title="Refresh Ticker Data"
        >
          <RefreshCw
            className={`h-5 w-5 text-gray-600 ${loading ? "animate-spin" : ""}`}
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-gray-200"
          onClick={onRefreshMarketCap}
          disabled={loading}
          title="Refresh Market Cap Data"
        >
          <TrendingUp className="h-5 w-5 text-gray-600" />
        </Button>

        <div className="flex flex-col items-center gap-4 mt-4">
          <NavItem
            href="/"
            icon={<Home className="h-5 w-5" />}
            label="Home"
            active
          />
          <NavItem
            href="#"
            icon={<BarChart2 className="h-5 w-5" />}
            label="Analytics"
          />
          <NavItem
            href="#"
            icon={<Activity className="h-5 w-5" />}
            label="Markets"
          />
        </div>

        <div className="mt-auto flex flex-col items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Pairs</div>
            <div className="text-sm font-semibold text-gray-700">
              {tickerCount}
            </div>
          </div>
          <NavItem
            href="#"
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="mt-4 rounded-full hover:bg-gray-200"
          title="Help"
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
