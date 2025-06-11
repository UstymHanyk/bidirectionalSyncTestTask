"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { 
  Home,
  Users, 
  Settings, 
  Menu,
  LogOut,
  RefreshCw,
  Activity,
  Sparkles,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AuthCustomer, getStoredAuth } from "@/lib/auth"
import { useSync } from "@/hooks/use-sync"

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Integrations', href: '/integrations', icon: Settings },
]

export function Header() {
  const pathname = usePathname()
  const [auth, setAuth] = useState<AuthCustomer | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Get sync status for dynamic status indicator
  const { syncStatus, isLoading: isSyncLoading } = useSync(auth?.customerId || '')

  useEffect(() => {
    const authData = getStoredAuth()
    setAuth(authData)
  }, [])

  const getSyncStatusInfo = () => {
    if (isSyncLoading || !syncStatus) {
      return {
        icon: Loader2,
        text: 'Loading...',
        color: 'text-gray-600',
        bgColor: 'from-gray-50 to-gray-50 dark:from-gray-950/30 dark:to-gray-950/30',
        borderColor: 'border-gray-200/50 dark:border-gray-800/30',
        animate: 'animate-spin'
      }
    }

    const isActivelyRunning = (syncStatus.pendingOperations || 0) > 0 || syncStatus.status === 'syncing'

    if (isActivelyRunning) {
      return {
        icon: RefreshCw,
        text: 'Syncing',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30',
        borderColor: 'border-blue-200/50 dark:border-blue-800/30',
        animate: 'animate-spin'
      }
    }

    switch (syncStatus.status) {
      case 'failed':
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Failed',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'from-red-50 to-red-50 dark:from-red-950/30 dark:to-red-950/30',
          borderColor: 'border-red-200/50 dark:border-red-800/30',
          animate: ''
        }
      case 'success':
        return {
          icon: CheckCircle,
          text: 'Synced',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30',
          borderColor: 'border-green-200/50 dark:border-green-800/30',
          animate: (syncStatus.pendingOperations || 0) > 0 ? 'animate-pulse' : ''
        }
      default:
        return {
          icon: CheckCircle,
          text: 'Ready',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30',
          borderColor: 'border-green-200/50 dark:border-green-800/30',
          animate: ''
        }
    }
  }

  const statusInfo = getSyncStatusInfo()
  const StatusIcon = statusInfo.icon

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatCustomerId = (id: string) => {
    return id.slice(0, 8) + '...'
  }

  const NavLink = ({ 
    href, 
    children, 
    icon: Icon, 
    mobile = false,
    onClick 
  }: { 
    href: string
    children: React.ReactNode
    icon: any
    mobile?: boolean
    onClick?: () => void
  }) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
    
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "group relative flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ease-out",
          mobile ? "w-full hover:translate-x-1" : "hover:scale-105",
          isActive
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95"
        )}
      >
        <Icon className={cn(
          "h-4 w-4 transition-transform duration-200",
          isActive ? "scale-100" : "group-hover:scale-100"
        )} />
        <span className="font-medium">{children}</span>
        {isActive && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 -z-10" />
        )}
      </Link>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/" 
              className="group flex items-center space-x-3 hover:opacity-80 transition-all duration-300 hover:scale-105"
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary/80 shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow duration-300">
                <RefreshCw className="h-4 w-4 text-primary-foreground group-hover:rotate-180 transition-transform duration-500" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 to-transparent" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    Contact Sync
                  </span>
                  <Badge variant="secondary" className="text-xs font-semibold bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Pro
                  </Badge>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navigation.map((item) => (
              <NavLink key={item.name} href={item.href} icon={item.icon}>
                {item.name}
              </NavLink>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            {/* Dynamic Sync Status Indicator */}
            {auth?.customerId && (
              <div className={cn(
                "hidden sm:flex items-center space-x-2 px-3 py-2 rounded-full bg-gradient-to-r border transition-all duration-300",
                statusInfo.bgColor,
                statusInfo.borderColor
              )}>
                <StatusIcon className={cn(
                  "h-3 w-3",
                  statusInfo.color,
                  statusInfo.animate
                )} />
                <span className={cn(
                  "text-xs font-semibold",
                  statusInfo.color
                )}>
                  {statusInfo.text}
                </span>
                                 {syncStatus && (syncStatus.pendingOperations || 0) > 0 && (
                   <Badge variant="secondary" className="text-xs ml-1 bg-white/80">
                     {syncStatus.pendingOperations}
                   </Badge>
                 )}
              </div>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all duration-300 hover:scale-105"
                >
                  <Avatar className="h-9 w-9 ring-2 ring-background shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-semibold border border-primary/10">
                      {auth?.customerName ? getInitials(auth.customerName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-64 p-2 bg-background/95 backdrop-blur-xl border border-border/50 shadow-xl"
              >
                <DropdownMenuLabel className="flex flex-col space-y-2 p-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-semibold">
                        {auth?.customerName ? getInitials(auth.customerName) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {auth?.customerName || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        ID: {auth?.customerId ? formatCustomerId(auth.customerId) : 'Not set'}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden h-9 w-9 rounded-xl hover:bg-muted/60 transition-all duration-300 hover:scale-105"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-80 p-0 bg-background/95 backdrop-blur-xl border-l border-border/50"
              >
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <SheetHeader className="p-6 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-primary/80">
                          <RefreshCw className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <SheetTitle className="text-lg font-bold">Contact Sync</SheetTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </SheetHeader>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                      {/* User Info */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12 ring-2 ring-background">
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-semibold text-lg">
                              {auth?.customerName ? getInitials(auth.customerName) : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              {auth?.customerName || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              ID: {auth?.customerId ? formatCustomerId(auth.customerId) : 'Not set'}
                            </p>
                            <div className="flex items-center space-x-1 mt-1">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <span className="text-xs text-green-600 font-medium">Online</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Navigation */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Navigation
                        </h4>
                        <div className="space-y-1">
                          {navigation.map((item) => (
                            <NavLink 
                              key={item.name} 
                              href={item.href} 
                              icon={item.icon} 
                              mobile
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {item.name}
                            </NavLink>
                          ))}
                        </div>
                      </div>

                      {/* Account Actions */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Account
                        </h4>
                        <div className="space-y-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start rounded-xl h-12 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 hover:translate-x-1 transition-all duration-300"
                          >
                            <LogOut className="mr-3 h-4 w-4" />
                            Sign Out
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-border/50">
                    <div className="flex items-center justify-center space-x-2 text-xs">
                      {auth?.customerId && (
                        <>
                          <StatusIcon className={cn(
                            "h-3 w-3",
                            statusInfo.color,
                            statusInfo.animate
                          )} />
                          <span className={statusInfo.color}>
                            {statusInfo.text}
                            {syncStatus && (syncStatus.pendingOperations || 0) > 0 && ` (${syncStatus.pendingOperations})`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  )
}
