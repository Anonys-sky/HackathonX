import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Globe, Home, Activity, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@shared/brand";
import { SquirryMascot } from "@/components/SquirryMascot";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, key: "nav.dashboard" },
  { href: "/activity", icon: Activity, key: "nav.activity" },
  { href: "/social", icon: Users, key: "nav.social" },
  { href: "/wealth", icon: Zap, key: "nav.wealth" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top navigation with language toggle */}
      <div className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-display text-lg text-foreground">
            <SquirryMascot mood="happy" size={28} className="shrink-0" />
            <span>{BRAND_NAME}</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-lg">
                <Globe size={16} className="mr-1" />
                {language === "en" ? "EN" : "BM"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage("en")} className={cn(language === "en" && "bg-muted")}>
                {t("common.english")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("bm")} className={cn(language === "bm" && "bg-muted")}>
                {t("common.bahasa_malaysia")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto w-full">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                title={t(item.key)}
              >
                <Icon size={20} />
                <span className="text-[10px] font-semibold">{t(item.key)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-4">
      <div>
        <h1 className="text-2xl font-display text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
