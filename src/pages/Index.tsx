
import { ScannerProvider } from '@/context/ScannerContext';
import { Header } from '@/components/Header';
import { RepositoryForm } from '@/components/RepositoryForm';
import { ScanProgress } from '@/components/ScanProgress';
import { ScanResults } from '@/components/ScanResults';
import { RecentScans } from '@/components/RecentScans';
import { TooltipProvider } from '@/components/ui/tooltip';

const Index = () => {
  return (
    <ScannerProvider>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          
          <main className="flex-1 container mx-auto p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left column for form */}
              <div className="lg:col-span-1">
                <RepositoryForm />
              </div>
              
              {/* Right column for scan results */}
              <div className="lg:col-span-2">
                <ScanProgress />
                <ScanResults />
                <RecentScans />
              </div>
            </div>
          </main>
          
          <footer className="bg-scanner-dark border-t border-scanner-secondary p-4">
            <div className="container mx-auto text-center text-sm text-gray-400">
              <p>Code Guardian - Git Repository Secrets Scanner</p>
            </div>
          </footer>
        </div>
      </TooltipProvider>
    </ScannerProvider>
  );
};

export default Index;
