
import { Button } from '@/components/ui/button';
import { GitBranch, Lock, Shield } from 'lucide-react';

export const Header = () => {
  return (
    <header className="w-full bg-scanner-dark border-b border-scanner-secondary p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-scanner-primary mr-2" />
          <div>
            <h1 className="text-xl font-bold text-white">Code Guardian</h1>
            <p className="text-xs text-gray-400">Git Repository Secrets Scanner</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-1">
          <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-scanner-dark">
            <GitBranch className="h-4 w-4 mr-2" />
            Repositories
          </Button>
          <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-scanner-dark">
            <Lock className="h-4 w-4 mr-2" />
            Secrets
          </Button>
          <Button className="bg-scanner-primary hover:bg-scanner-secondary text-white ml-2">
            New Scan
          </Button>
        </div>
        
        <Button className="md:hidden" variant="ghost">
          <Shield className="h-5 w-5 text-scanner-primary" />
        </Button>
      </div>
    </header>
  );
};
