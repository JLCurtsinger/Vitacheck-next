"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Menu, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Temporary auth state - replace with Supabase auth hook later
const isAuthed = false

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const isResultsPage = pathname === "/results"

  const handleSignOut = () => {
    console.log("sign out")
    // TODO: Implement Supabase sign out
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center font-semibold text-lg hover:opacity-80 transition-opacity"
        >
          Vitacheck.cc
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* New check button - only on results page */}
        {isResultsPage && (
          <Button
            onClick={() => router.push("/")}
            variant="default"
            size="sm"
            className="mr-2 gap-2"
          >
            <Plus className="h-4 w-4" />
            New check
          </Button>
        )}

        {/* Menu Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/experiences">Experiences</Link>
            </DropdownMenuItem>
            {isAuthed ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/account">Account</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login">Sign In</Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}

