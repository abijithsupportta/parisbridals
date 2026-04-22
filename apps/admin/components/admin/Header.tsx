import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Header() {
  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            A
          </div>
          <div className="text-sm">
            <p className="font-medium">Admin User</p>
            <p className="text-muted-foreground text-xs">admin@parisbridals.com</p>
          </div>
        </div>
      </div>
    </header>
  );
}
