"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart2,
  RefreshCw,
  Coins,
  Activity,
  Settings,
  HelpCircle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onRefreshTicker?: () => void;
  loading?: boolean;
  tickerCount?: number;
}

export default function Sidebar({
  onRefreshTicker,
  loading = false,
  tickerCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:8000/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role === 'admin') {
            setIsAdmin(true);
          }
        }
      } catch {
        // Silent fail - admin link won't show
      }
    };

    checkAdminStatus();
  }, []);
  
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


        <div className="flex flex-col items-center gap-4 mt-4">
          <NavItem
            href="/"
            icon={<Home className="h-5 w-5" />}
            label="Home"
            active={pathname === "/"}
          />
          <NavItem
            href="/screener"
            icon={<BarChart2 className="h-5 w-5" />}
            label="Screener"
            active={pathname === "/screener"}
          />
          <NavItem
            href="#"
            icon={<Activity className="h-5 w-5" />}
            label="Markets"
            active={false}
            disabled={true}
          />
          {isAdmin && (
            <NavItem
              href="/admin"
              icon={<Shield className="h-5 w-5" />}
              label="Admin"
              active={pathname === "/admin"}
            />
          )}
        </div>

        <div className="mt-auto flex flex-col items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Pairs</div>
            <div className="text-sm font-semibold text-gray-700">
              {tickerCount}
            </div>
          </div>
          <NavItem
            href="/settings"
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
  disabled = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  const content = (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full ${
          disabled 
            ? "cursor-not-allowed" 
            : "hover:bg-gray-200"
        } ${active ? "bg-gray-200" : ""}`}
        disabled={disabled}
      >
        <span className={disabled ? "text-gray-400" : "text-gray-600"}>
          {icon}
        </span>
      </Button>
      <span className={`text-xs ${
        disabled 
          ? "text-gray-400" 
          : "text-gray-500 group-hover:text-gray-700"
      }`}>
        {label}
      </span>
    </>
  );

  if (disabled) {
    return (
      <div className="flex flex-col items-center gap-1 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className="flex flex-col items-center gap-1 group">
      {content}
    </Link>
  );
}
